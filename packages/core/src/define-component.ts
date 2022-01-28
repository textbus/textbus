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

/**
 * TextBus 扩展组件接口
 */
export interface ComponentOptions<Methods extends ComponentMethods<State>, State, InitData> {
  /** 组件名 */
  name: string
  /** 组件类型 */
  type: ContentType

  /**
   * JSON 数据转组件初始参数转换方法
   * @param translator TextBus 数据转换器
   * @param state 组件 JSON 数据
   */
  transform(translator: Translator, state: State): InitData

  /**
   * 组件初始化实现
   * @param initState
   */
  setup(initState?: InitData): Methods
}

/**
 * TextBus 组件
 */
export interface Component<ComponentInstance = any, State = any, InitData = any> {
  /** 组件名 */
  name: string

  /**
   * JSON 数据转组件初始参数转换方法
   * @param translator
   * @param state
   */
  transform(translator: Translator, state: State): InitData

  /**
   * 组件创建实例的方法
   * @param context
   * @param state
   */
  createInstance(context: Injector, state?: InitData): ComponentInstance
}

/**
 * 组件内状态管理器
 */
export interface ChangeController<T> {
  /** 组件状态变化时触发 */
  onChange: Observable<T>

  /**
   * 组件状态更新函数
   * @param fn
   */
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

/**
 * TextBus 扩展组件方法
 * @param options
 */
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
        get parentComponent() {
          return componentInstance.parent?.parent || null
        },
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

/**
 * 组件 setup 方法内获取编辑器 IoC 容器的勾子
 */
export function useContext(): Injector {
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  return context.contextInjector
}

/**
 * 组件 setup 方法内获取组件实例的勾子
 */
export function useSelf<Methods extends ComponentMethods<State> = ComponentMethods, State = any>(): ComponentInstance<Methods, State> {
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  return context.componentInstance as ComponentInstance<Methods, State>
}

/**
 * 组件使用子插槽的方法
 * @param slots 子插槽数组
 * @param slotRestore 当组件被恢复时，还原实例的工厂函数
 */
export function useSlots<T extends Slot, State extends SlotLiteral>(slots: T[], slotRestore: SlotRestore<T, State>): Slots<State, T> {
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  const s = new Slots(context.componentInstance, slotRestore, slots)
  context.slots = s
  return s
}

/**
 * 组件注册状态管理器的勾子
 * @param initState
 */
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

/**
 * 组件单元素引用勾子
 */
export function useRef<T>() {
  return {
    current: null
  } as Ref<T>
}

/**
 * 组件多元素引用勾子
 */
export function useRefs<T>() {
  return [] as T[]
}

/**
 * 组件注册动态快捷键的勾子
 * @param config
 */
export function useDynamicShortcut(config: Shortcut) {
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  context.dynamicShortcut.push(config)
}

let eventHandleFn: null | ((...args: any[]) => void) = null
let isPreventDefault = false

/**
 * TextBus 事件对象
 */
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
  onContentInserted: (event: Event<InsertEventData>) => void
  onContentInsert: (event: Event<InsertEventData>) => void
  onEnter: (event: Event<EnterEventData>) => void
  onContentDelete: (event: Event<DeleteEventData>) => void
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

/**
 * 触发组件事件的方法
 * @param target 目标组件
 * @param eventType 事件名
 * @param data 事件对象
 */
export function invokeListener(target: ComponentInstance, eventType: 'onContentDelete', data: Event<DeleteEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onSlotRemove', data: Event<null>): void
export function invokeListener(target: ComponentInstance, eventType: 'onEnter', data: Event<EnterEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onContentInsert', data: Event<InsertEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onContentInserted', data: Event<InsertEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onContextMenu', data: Event<null>): void
export function invokeListener(target: ComponentInstance, eventType: 'onPaste', data: Event<PasteEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onDestroy'): void
export function invokeListener(target: ComponentInstance, eventType: 'onViewChecked'): void
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

/**
 * 组件内粘贴事件勾子
 * @param listener
 */
export function onPaste(listener: EventTypes['onPaste']) {
  if (eventCache) {
    eventCache.add('onPaste', listener)
  }
}

/**
 * 组件右键菜单事件勾子
 * @param listener
 */
export function onContextMenu(listener: EventTypes['onContextMenu']) {
  if (eventCache) {
    eventCache.add('onContextMenu', listener)
  }
}

/**
 * 组件视图更新后的勾子
 * @param listener
 */
export function onViewChecked(listener: EventTypes['onViewChecked']) {
  if (eventCache) {
    eventCache.add('onViewChecked', listener)
  }
}

/**
 * 组件第一次渲染后的勾子
 * @param listener
 */
export function onViewInit(listener: EventTypes['onViewInit']) {
  if (eventCache) {
    eventCache.add('onViewInit', listener)
  }
}

/**
 * 组件子插槽删除时的勾子
 * @param listener
 */
export function onSlotRemove(listener: EventTypes['onSlotRemove']) {
  if (eventCache) {
    eventCache.add('onSlotRemove', listener)
  }
}

/**
 * 组件子插槽内容删除时的勾子
 * @param listener
 */
export function onContentDelete(listener: EventTypes['onContentDelete']) {
  if (eventCache) {
    eventCache.add('onContentDelete', listener)
  }
}

/**
 * 组件子插槽换行时的勾子
 * @param listener
 */
export function onEnter(listener: EventTypes['onEnter']) {
  if (eventCache) {
    eventCache.add('onEnter', listener)
  }
}

/**
 * 组件子插槽插入内容时的勾子
 * @param listener
 */
export function onContentInsert(listener: EventTypes['onContentInsert']) {
  if (eventCache) {
    eventCache.add('onContentInsert', listener)
  }
}

/**
 * 组件子插槽插入内容后时的勾子
 * @param listener
 */
export function onContentInserted(listener: EventTypes['onContentInserted']) {
  if (eventCache) {
    eventCache.add('onContentInserted', listener)
  }
}

/**
 * 组件销毁时的勾子
 * @param listener
 */
export function onDestroy(listener: EventTypes['onDestroy']) {
  if (eventCache) {
    eventCache.add('onDestroy', listener)
  }
}
