import { Draft, produce, Patch } from 'immer'
import { Observable, Subject, Subscription } from '@tanbo/stream'
import { Injector } from '@tanbo/di'

import { Translator } from './foundation/_api'
import {
  ComponentInstance,
  ComponentMethods,
  ContentType,
  ChangeMarker,
  Slot,
  SlotLiteral,
  SlotRestore,
  Slots, Shortcut
} from './model/_api'
import { makeError } from './_utils/make-error'

const componentErrorFn = makeError('DefineComponent')

export interface ComponentOptions<Methods extends ComponentMethods<State>, State, InitData> {
  name: string
  type: ContentType

  transform(translator: Translator, state: State): InitData

  setup(initState?: InitData): Methods
}

export interface Component<ComponentInstance = any, State = any, InitData = any> {
  name: string

  transform(translator: Translator, state: State): InitData

  createInstance(context: Injector, state?: InitData): ComponentInstance
}

export interface ChangeController<T> {
  onChange: Observable<T>

  update(fn: (draft: Draft<T>) => void): T
}

export interface Ref<T> {
  current: T | null
}

interface ComponentContext<T> {
  slots: Slots<any>
  initState?: T
  changeController: ChangeController<T>
  contextInjector: Injector
  componentInstance: ComponentInstance,
  dynamicShortcut: Shortcut[]
}

let context: ComponentContext<any> | null = null

export function defineComponent<Methods extends ComponentMethods,
  State = any,
  InitData = any>(options: ComponentOptions<Methods, State, InitData>): Component<ComponentInstance<Methods, State>, State, InitData> {
  return {
    name: options.name,
    transform(translator: Translator, state: State): InitData {
      return options.transform(translator, state)
    },
    createInstance(contextInjector: Injector, initData: InitData) {
      const marker = new ChangeMarker()
      const stateChangeSubject = new Subject<any>()
      recordContextListener()

      const changeController: ChangeController<State> = {
        update(fn) {
          return componentInstance.updateState(fn)
        },
        onChange: stateChangeSubject.asObservable()
      }

      const componentInstance: ComponentInstance<Methods, State> = {
        changeMarker: marker,
        parent: null,
        name: options.name,
        length: 1,
        type: options.type,
        slots: null as any,
        methods: null as any,
        shortcutList: null as any,
        updateState(fn) {
          let changes!: Patch[]
          let inverseChanges!: Patch[]
          const newState = produce(state, fn, (p, ip) => {
            changes = p
            inverseChanges = ip
          })
          state = newState
          stateChangeSubject.next(newState)
          marker.markAsDirtied({
            path: [],
            apply: [{
              type: 'apply',
              patches: changes!
            }],
            unApply: [{
              type: 'apply',
              patches: inverseChanges!
            }]
          })
          return newState
        },
        toJSON() {
          return {
            name: options.name,
            state: componentInstance.methods.toJSON()
          }
        }
      }
      context = {
        contextInjector,
        changeController,
        slots: new Slots(componentInstance, () => new Slot([])),
        componentInstance: componentInstance,
        dynamicShortcut: []
      }
      componentInstance.methods = options.setup(initData)
      componentInstance.slots = context.slots
      componentInstance.shortcutList = context.dynamicShortcut
      let state = context.initState

      const subscriptions: Subscription[] = [
        context.slots.onChange.subscribe(ops => {
          marker.markAsDirtied(ops)
        }),

        context.slots.onChildComponentRemoved.subscribe(instance => {
          marker.recordComponentRemoved(instance)
        }),

        context.slots.onChildSlotChange.subscribe(d => {
          marker.markAsChanged(d.operation)
        })
      ]

      onDestroy(() => {
        subscriptions.forEach(i => i.unsubscribe())
      })

      context = null
      recordContextListenerEnd(componentInstance)
      return componentInstance
    }
  }
}

export function useContext(): Injector {
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  return context.contextInjector
}

export function useSelf<Methods extends ComponentMethods<State> = ComponentMethods, State = any>(): ComponentInstance<Methods, State> {
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  return context.componentInstance as ComponentInstance<Methods, State>
}

export function useSlots<T extends Slot, State extends SlotLiteral>(slots: T[], slotRestore: SlotRestore<T, State>): Slots<State, T> {
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  const s = new Slots(context.componentInstance, slotRestore, slots)
  context.slots = s
  return s
}

export function useState<T>(initState: T) {
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  if (Reflect.has(context, 'initState')) {
    throw componentErrorFn('only one unique state is allowed for a component!')
  }
  context.initState = initState
  return context.changeController as ChangeController<T>
}

export function useRef<T>() {
  return {
    current: null
  } as Ref<T>
}

export function useRefs<T>() {
  return [] as T[]
}

export function useDynamicShortcut(config: Shortcut) {
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  context.dynamicShortcut.push(config)
}

let eventHandleFn: null | ((...args: any[]) => void) = null
let isPreventDefault = false


export class Event<T, S extends Slot = Slot> {
  constructor(public target: S,
              public data: T,
              eventHandle: (...args: any[]) => void
  ) {
    eventHandleFn = eventHandle
  }

  preventDefault() {
    isPreventDefault = true
  }
}

export interface InsertEventData {
  index: number
  content: string | ComponentInstance
}

export interface EnterEventData {
  index: number
}

export interface DeleteEventData {
  index: number
  count: number
}

export interface PasteEventData {
  index: number
  data: Slot
  text: string
}

export interface ContextMenuItem {
  iconClasses?: string[]
  label: string
  disabled?: boolean

  onClick(): void
}


export interface EventTypes {
  onPaste: (event: Event<PasteEventData>) => void
  onInserted: (event: Event<InsertEventData>) => void
  onInsert: (event: Event<InsertEventData>) => void
  onEnter: (event: Event<EnterEventData>) => void
  onDelete: (event: Event<DeleteEventData>) => void
  onSlotRemove: (event: Event<null>) => void
  onContextMenu: (event: Event<null>) => ContextMenuItem[]
  onViewChecked: () => void
  onViewInit: () => void
  onDestroy: () => void
}

class EventCache<T, K extends keyof T = keyof T> {
  private listeners = new Map<K, Array<T[K]>>()

  add(eventType: K, callback: T[K]) {
    let callbacks = this.listeners.get(eventType)
    if (!callbacks) {
      callbacks = []
      this.listeners.set(eventType, callbacks)
    }
    callbacks.push(callback)
  }

  get(eventType: K): Array<T[K]> {
    return this.listeners.get(eventType) || []
  }

  clean(eventType: K) {
    this.listeners.delete(eventType)
  }
}

const eventCacheMap = new WeakMap<ComponentInstance, EventCache<EventTypes>>()

let eventCache: EventCache<EventTypes> | null = null

function recordContextListener() {
  eventCache = new EventCache()
}

function recordContextListenerEnd(component: ComponentInstance) {
  if (eventCache) {
    eventCacheMap.set(component, eventCache)
  }
  eventCache = null
}

export function invokeListener(target: ComponentInstance, eventType: 'onDestroy'): void
export function invokeListener(target: ComponentInstance, eventType: 'onViewChecked'): void
export function invokeListener(target: ComponentInstance, eventType: 'onDelete', data: Event<DeleteEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onSlotRemove', data: Event<null>): void
export function invokeListener(target: ComponentInstance, eventType: 'onEnter', data: Event<EnterEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onInsert', data: Event<InsertEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onInserted', data: Event<InsertEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onContextMenu', data: Event<null>): void
export function invokeListener(target: ComponentInstance, eventType: 'onPaste', data: Event<PasteEventData>): void
export function invokeListener<K extends keyof EventTypes,
  D = EventTypes[K] extends (...args: infer U) => any ? U : never>(target: ComponentInstance, eventType: K, data?: D) {
  const cache = eventCacheMap.get(target)
  if (cache) {
    const callbacks = cache.get(eventType)
    const values = callbacks.map(fn => {
      return (fn as any)(data)
    })
    if (eventType === 'onViewChecked') {
      const viewInitCallbacks = cache.get('onViewInit')
      cache.clean('onViewInit')
      viewInitCallbacks.forEach(fn => {
        (fn as any)(data)
      })
    }
    if (!isPreventDefault) {
      eventHandleFn?.(...values)
    }
    isPreventDefault = false
    eventHandleFn = null
  }
}

export function onPaste(listener: EventTypes['onPaste']) {
  if (eventCache) {
    eventCache.add('onPaste', listener)
  }
}

export function onContextMenu(listener: EventTypes['onContextMenu']) {
  if (eventCache) {
    eventCache.add('onContextMenu', listener)
  }
}

export function onViewChecked(listener: EventTypes['onViewChecked']) {
  if (eventCache) {
    eventCache.add('onViewChecked', listener)
  }
}

export function onViewInit(listener: EventTypes['onViewInit']) {
  if (eventCache) {
    eventCache.add('onViewInit', listener)
  }
}

export function onSlotRemove(listener: EventTypes['onSlotRemove']) {
  if (eventCache) {
    eventCache.add('onSlotRemove', listener)
  }
}

export function onDelete(listener: EventTypes['onDelete']) {
  if (eventCache) {
    eventCache.add('onDelete', listener)
  }
}

export function onEnter(listener: EventTypes['onEnter']) {
  if (eventCache) {
    eventCache.add('onEnter', listener)
  }
}

export function onInsert(listener: EventTypes['onInsert']) {
  if (eventCache) {
    eventCache.add('onInsert', listener)
  }
}

export function onInserted(listener: EventTypes['onInserted']) {
  if (eventCache) {
    eventCache.add('onInserted', listener)
  }
}

export function onDestroy(listener: EventTypes['onDestroy']) {
  if (eventCache) {
    eventCache.add('onDestroy', listener)
  }
}
