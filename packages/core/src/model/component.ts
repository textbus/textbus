import { Draft, produce, Patch, enablePatches } from 'immer'
import { Observable, Subject, Subscription } from '@tanbo/stream'
import { Injector } from '@tanbo/di'

import { makeError } from '../_utils/make-error'
import { VElement } from './element'
import { ContentType, Slot, SlotLiteral } from './slot'
import { ChangeMarker } from './change-marker'
import { Slots } from './slots'

enablePatches()

const componentErrorFn = makeError('DefineComponent')

export interface SlotsComponentData<State> {
  slots: Slot[]
  state?: State
}

export interface StateComponentData<State> {
  slots?: Slot[]
  state: State
}

export type ComponentData<State = unknown> = SlotsComponentData<State> | StateComponentData<State>

export interface ComponentLiteral<State = any> {
  name: string
  slots: SlotLiteral[]
  state: State
}

export interface SlotRenderFactory {
  (): VElement
}

export interface SlotRender {
  (slot: Slot, factory: SlotRenderFactory): VElement
}

export interface ComponentRender {
  (isOutputMode: boolean, slotRender: SlotRender): VElement
}

/**
 * 组件 setup 函数返回值必须要实现的接口
 */
export interface ComponentMethods {
  render: ComponentRender
}

export interface Keymap {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  key: string | string[];
}

export interface Shortcut {
  keymap: Keymap

  action(key: string): void
}

/**
 * 组件实例对象
 */
export interface ComponentInstance<Methods extends ComponentMethods = ComponentMethods, State = any> {
  /**
   * 组件所在的插槽
   * @readonly
   * @internal
   */
  parent: Slot | null
  /**
   * 父组件
   * @readonly
   * @internal
   */
  parentComponent: ComponentInstance | null
  /** 组件变化标识器 */
  changeMarker: ChangeMarker
  /** 组件名 */
  name: string
  /** 组件长度，固定为 1 */
  length: 1
  /** 组件类型 */
  type: ContentType
  /** 组件的子插槽集合 */
  slots: Slots
  /** 组件内部实现的方法 */
  methods: Methods
  /** 组件动态上下文菜单注册表 */
  shortcutList: Shortcut[]

  /**
   * 更新组件状态的方法
   * @param fn
   */
  updateState(fn: (draft: Draft<State>) => void): State

  /**
   * 组件转为 JSON 数据的方法
   */
  toJSON(): ComponentLiteral<State>
}

/**
 * TextBus 扩展组件接口
 */
export interface ComponentOptions<Methods extends ComponentMethods, State> {
  /** 组件名 */
  name: string
  /** 组件类型 */
  type: ContentType

  /**
   * 组件初始化实现
   * @param initData
   */
  setup(initData: ComponentData<State>): Methods
}

/**
 * TextBus 组件
 */
export interface Component<ComponentInstance = any, Data = any> {
  /** 组件名 */
  name: string

  /**
   * 组件创建实例的方法
   * @param context
   * @param data
   */
  createInstance(context: Injector, data?: Data): ComponentInstance
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

interface ComponentContext<T> {
  slots: Slots
  initState?: T
  changeController: ChangeController<T>
  contextInjector: Injector
  componentInstance: ComponentInstance
  dynamicShortcut: Shortcut[]
  eventCache: EventCache<EventTypes>
}

const eventCacheMap = new WeakMap<ComponentInstance, EventCache<EventTypes>>()
const contextStack: ComponentContext<any>[] = []

function getCurrentContext() {
  return contextStack[contextStack.length - 1] || null
}

/**
 * TextBus 扩展组件方法
 * @param options
 */
export function defineComponent<Methods extends ComponentMethods,
  State = any>(options: ComponentOptions<Methods, State>): Component<ComponentInstance<Methods, State>, ComponentData<State>> {
  return {
    name: options.name,
    createInstance(contextInjector: Injector, initData: ComponentData<State> = {slots: []}) {
      const marker = new ChangeMarker()
      const stateChangeSubject = new Subject<any>()

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
          }) as State
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
            state: state!,
            slots: componentInstance.slots.toJSON()
          }
        }
      }
      const context: ComponentContext<State> = {
        contextInjector,
        changeController,
        slots: new Slots(componentInstance),
        componentInstance: componentInstance,
        dynamicShortcut: [],
        eventCache: new EventCache<EventTypes>(),
      }
      contextStack.push(context)
      componentInstance.methods = options.setup(initData)
      onDestroy(() => {
        eventCacheMap.delete(componentInstance)
        subscriptions.forEach(i => i.unsubscribe())
      })
      eventCacheMap.set(componentInstance, context.eventCache)
      contextStack.pop()
      componentInstance.slots = context.slots
      componentInstance.shortcutList = context.dynamicShortcut
      let state = Reflect.has(context, 'initState') ? context.initState : initData.state

      const subscriptions: Subscription[] = [
        context.slots.onChange.subscribe(ops => {
          marker.markAsDirtied(ops)
        }),

        context.slots.onChildComponentRemoved.subscribe(instance => {
          marker.recordComponentRemoved(instance)
        }),

        context.slots.onChildSlotChange.subscribe(d => {
          marker.markAsChanged(d.operation)
        }),

        context.slots.onChildSlotForceChange.subscribe(() => {
          marker.forceMarkChanged()
        })
      ]

      return componentInstance
    }
  }
}

/**
 * 组件 setup 方法内获取编辑器 IoC 容器的勾子
 */
export function useContext(): Injector {
  const context = getCurrentContext()
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  return context.contextInjector
}

/**
 * 组件 setup 方法内获取组件实例的勾子
 */
export function useSelf<Methods extends ComponentMethods = ComponentMethods, State = any>(): ComponentInstance<Methods, State> {
  const context = getCurrentContext()
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  return context.componentInstance as ComponentInstance<Methods, State>
}

/**
 * 组件使用子插槽的方法
 * @param slots 子插槽数组
 */
export function useSlots<T>(slots: Slot<T>[]): Slots {
  const context = getCurrentContext()
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  const s = new Slots(context.componentInstance, slots)
  context.slots = s
  return s
}

/**
 * 组件注册状态管理器的勾子
 * @param initState
 */
export function useState<T>(initState: T) {
  const context = getCurrentContext()
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
  const context = getCurrentContext()
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

function makeEventHook<T extends keyof EventTypes>(type: T) {
  return function (listener: EventTypes[T]) {
    const context = getCurrentContext()
    if (context) {
      context.eventCache.add(type, listener)
    }
  }
}

/**
 * 组件内粘贴事件勾子
 */
export const onPaste = makeEventHook('onPaste')

/**
 * 组件右键菜单事件勾子
 */
export const onContextMenu = makeEventHook('onContextMenu')

/**
 * 组件视图更新后的勾子
 */
export const onViewChecked = makeEventHook('onViewChecked')

/**
 * 组件第一次渲染后的勾子
 */
export const onViewInit = makeEventHook('onViewInit')

/**
 * 组件子插槽删除时的勾子
 */
export const onSlotRemove = makeEventHook('onSlotRemove')

/**
 * 组件子插槽内容删除时的勾子
 */
export const onContentDelete = makeEventHook('onContentDelete')

/**
 * 组件子插槽换行时的勾子
 */
export const onEnter = makeEventHook('onEnter')

/**
 * 组件子插槽插入内容时的勾子
 */
export const onContentInsert = makeEventHook('onContentInsert')

/**
 * 组件子插槽插入内容后时的勾子
 */
export const onContentInserted = makeEventHook('onContentInserted')

/**
 * 组件销毁时的勾子
 */
export const onDestroy = makeEventHook('onDestroy')
