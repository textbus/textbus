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
  Slots
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
  update(newState: T): void

  onChange: Observable<T>
}

export interface Ref<T> {
  current: T | null
}

interface ComponentContext<T> {
  slots: Slots<any>
  initState?: T
  changeController: ChangeController<T>
  contextInjector: Injector
  componentInstance: ComponentInstance
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

      const changeController: ChangeController<any> = {
        update(newState: any) {
          if (typeof newState === 'object') {
            Object.freeze(newState)
          }
          stateChangeSubject.next(newState)
          const oldState = state
          state = newState
          marker.markAsDirtied({
            path: [],
            apply: [{
              type: 'apply',
              state
            }],
            unApply: [{
              type: 'apply',
              state: oldState
            }]
          })
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
        useState(newState: State) {
          const oldState = state
          state = newState
          stateChangeSubject.next(newState)
          marker.markAsDirtied({
            path: [],
            apply: [{
              type: 'apply',
              state: newState
            }],
            unApply: [{
              type: 'apply',
              state: oldState
            }]
          })
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
        componentInstance: componentInstance
      }
      componentInstance.methods = options.setup(initData)
      componentInstance.slots = context.slots
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
  if (typeof initState === 'object') {
    Object.freeze(initState)
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

let eventHandleFn: null | ((...args: any[]) => void) = null
let isPreventDefault = false


export class TBEvent<T, S extends Slot = Slot> {
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
  onPaste: (event: TBEvent<PasteEventData>) => void
  onInserted: (event: TBEvent<InsertEventData>) => void
  onInsert: (event: TBEvent<InsertEventData>) => void
  onEnter: (event: TBEvent<EnterEventData>) => void
  onDelete: (event: TBEvent<DeleteEventData>) => void
  onSlotRemove: (event: TBEvent<null>) => void
  onContextMenu: (event: TBEvent<null>) => ContextMenuItem[]
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

const eventCaches = new WeakMap<ComponentInstance, EventCache<EventTypes>>()

let rendererContext: EventCache<EventTypes> | null = null

function recordContextListener() {
  rendererContext = new EventCache()
}

function recordContextListenerEnd(component: ComponentInstance) {
  if (rendererContext) {
    eventCaches.set(component, rendererContext)
  }
  rendererContext = null
}

export function invokeListener(target: ComponentInstance, eventType: 'onDestroy'): void
export function invokeListener(target: ComponentInstance, eventType: 'onViewChecked'): void
export function invokeListener(target: ComponentInstance, eventType: 'onDelete', data: TBEvent<DeleteEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onSlotRemove', data: TBEvent<null>): void
export function invokeListener(target: ComponentInstance, eventType: 'onEnter', data: TBEvent<EnterEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onInsert', data: TBEvent<InsertEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onInserted', data: TBEvent<InsertEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onContextMenu', data: TBEvent<null>): void
export function invokeListener(target: ComponentInstance, eventType: 'onPaste', data: TBEvent<PasteEventData>): void
export function invokeListener<K extends keyof EventTypes,
  D = EventTypes[K] extends (...args: infer U) => any ? U : never>(target: ComponentInstance, eventType: K, data?: D) {
  const cache = eventCaches.get(target)
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
  if (rendererContext) {
    rendererContext.add('onPaste', listener)
  }
}

export function onContextMenu(listener: EventTypes['onContextMenu']) {
  if (rendererContext) {
    rendererContext.add('onContextMenu', listener)
  }
}

export function onViewChecked(listener: EventTypes['onViewChecked']) {
  if (rendererContext) {
    rendererContext.add('onViewChecked', listener)
  }
}

export function onViewInit(listener: EventTypes['onViewInit']) {
  if (rendererContext) {
    rendererContext.add('onViewInit', listener)
  }
}

export function onSlotRemove(listener: EventTypes['onSlotRemove']) {
  if (rendererContext) {
    rendererContext.add('onSlotRemove', listener)
  }
}

export function onDelete(listener: EventTypes['onDelete']) {
  if (rendererContext) {
    rendererContext.add('onDelete', listener)
  }
}

export function onEnter(listener: EventTypes['onEnter']) {
  if (rendererContext) {
    rendererContext.add('onEnter', listener)
  }
}

export function onInsert(listener: EventTypes['onInsert']) {
  if (rendererContext) {
    rendererContext.add('onInsert', listener)
  }
}

export function onInserted(listener: EventTypes['onInserted']) {
  if (rendererContext) {
    rendererContext.add('onInserted', listener)
  }
}

export function onDestroy(listener: EventTypes['onDestroy']) {
  if (rendererContext) {
    rendererContext.add('onDestroy', listener)
  }
}
