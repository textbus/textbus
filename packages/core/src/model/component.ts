import { AbstractType, Type, InjectionToken, InjectFlags } from '@viewfly/core'

import { makeError } from '../_utils/make-error'
import { AsyncSlotLiteral, ContentType, Slot, SlotLiteral } from './slot'
import { Formats } from './format'
import { ChangeMarker } from './change-marker'
import { Shortcut, State, RawKeyAgent } from './types'
import { Textbus } from '../textbus'
import { createObjectProxy, objectToJSON } from './proxy'
import { Attribute, Formatter } from './attribute'
import { AsyncSlot } from './async-model'

const componentErrorFn = makeError('Component')

/**
 * 组件 JSON 字面量接口
 */
export interface ComponentLiteral<State = any> {
  name: string
  state: State
}

export interface AsyncComponentLiteral<State = any> extends ComponentLiteral<State> {
  async: true
  metadata: any
}

export interface ZenCodingGrammarInterceptor<T extends State> {
  /** 匹配字符 */
  match: RegExp | ((content: string, textbus: Textbus) => boolean)
  /** 触发键 */
  key: string | string[] | RegExp | ((key: string, agent: RawKeyAgent) => boolean)

  /** 触发执行的方法 */
  createState(content: string, textbus: Textbus): T
}

/**
 * 组件扩展可选方法
 */
export interface Component<T extends State> {
  /**
   * 从当前组件拆分出一个新的同类组件
   * @param start 拆分的开始插槽
   * @param end 拆分的结束插槽
   */
  separate?(start?: Slot, end?: Slot): Component<T>

  /**
   * 组件初始化时调用的方法，可以此方法内同步使用 Textbus 提供的一系列勾子函数
   */
  setup?(): void

  /**
   * 当 Textbus 默认行为尝试删除插槽时调用，返回 true 表示删除成功。
   * 需要注意的是，实际删除是由组件自己完成的
   * @param slot
   */
  removeSlot?(slot: Slot): boolean

  /**
   * 获取组件数据模型上插槽的集合，需要按渲染顺序返回一个数组
   */
  getSlots?(): Slot[]
}

/**
 * 组件实例对象
 */
export abstract class Component<T extends State = State> {
  readonly id = Math.random()

  /**
   * 组件所在的插槽
   * @readonly
   * @internal
   */
  get parent(): Slot | null {
    return this.changeMarker.parentModel as Slot
  }

  /**
   * 父组件
   */
  get parentComponent(): Component | null {
    return this.parent?.parent || null
  }

  /**
   * 组件的子插槽集合
   */
  get slots() {
    if (typeof this.getSlots === 'function') {
      return this.getSlots()
    }
    return []
  }

  /** 组件长度，固定为 1 */
  readonly length = 1
  /** 组件动态上下文菜单注册表 */
  readonly shortcutList: Shortcut[] = []
  /** 组件名 */
  readonly name: string
  /** 组件类型 */
  readonly type: ContentType
  /** 组件状态 */
  readonly state: T

  /** 组件变化标识器 */
  readonly changeMarker: ChangeMarker

  constructor(public textbus: Textbus,
              initData: T) {

    const { componentName, type } = this.constructor as ComponentConstructor
    this.name = componentName
    this.type = type
    this.state = createObjectProxy(initData)
    this.changeMarker = this.state.__changeMarker__
    this.changeMarker.host = this

    const context: ComponentContext = {
      textbus,
      componentInstance: this,
      eventCache: new EventCache<EventTypes>(),
    }
    contextStack.push(context)
    if (typeof this.setup === 'function') {
      this.setup()
    }

    onDestroy(() => {
      eventCacheMap.delete(this)
    })
    eventCacheMap.set(this, context.eventCache)
    contextStack.pop()
  }

  /**
   * 组件转为 JSON 数据的方法
   */
  toJSON(): ComponentLiteral<State> {
    return {
      name: this.name,
      state: objectToJSON(this.state)
    }
  }

  /**
   * 将组件转换为 string
   */
  toString(): string {
    return this.slots.map(i => {
      return i.toString()
    }).join('')
  }
}


export type ToLiteral<T> = T extends AsyncSlot ? AsyncSlotLiteral :
  T extends Slot ? SlotLiteral :
    T extends [infer First, ...infer Rest] ? [ToLiteral<First>, ...Rest] :
      T extends Array<infer Item> ? Array<ToLiteral<Item>> :
        T extends Record<string, any> ? ComponentStateLiteral<T> : T;


export type ComponentStateLiteral<T extends State> = {
  [Key in keyof T]: ToLiteral<T[Key]>
}

/**
 * Textbus 组件
 */
export interface ComponentConstructor<ComponentState extends State = State> extends Type<Component<ComponentState>> {
  /** 组件名 */
  componentName: string
  /** 实例数据类型 */
  type: ContentType
  /** 快捷语法拦截器 */
  zenCoding?: ZenCodingGrammarInterceptor<ComponentState> |
    ZenCodingGrammarInterceptor<ComponentState>[]

  /**
   * 通过 JSON 创建组件实例
   * @param textbus
   * @param data 组件状态字面量
   */
  fromJSON?(textbus: Textbus, data: ComponentStateLiteral<ComponentState>): Component<ComponentState>
}

/**
 * 插入内容事件对象
 */
export interface InsertEventData {
  /** 插槽插入的位置 */
  index: number
  /** 当前插入的内容 */
  content: string | Component,
  /** 当前插入的附加的格式 */
  formats: Formats
}

/**
 * 换行事件对象
 */
export interface BreakEventData {
  /** 换行事件插槽的第几位触发的换行操作 */
  index: number
}

/**
 * 删除数据事件对象
 */
export interface DeleteEventData {
  /** 删除数据的位置 */
  index: number
  /** 删除数据的长度 */
  count: number
  /** 是否是向结束位置删除 */
  toEnd: boolean
  /** 删除内容还是移动内容 */
  actionType: 'delete' | 'move'
}

/**
 * 粘贴事件对象
 */
export interface PasteEventData {
  /** 标识粘贴发生在插槽的第几位 */
  index: number
  /** 粘贴的内容 */
  data: Slot
  /** 粘贴内容的纯文本 */
  text: string
}

/**
 * 组合输入开始事件对象
 */
export interface CompositionStartEventData {
  /** 标识在插槽的第几位触发 */
  index: number
}

/**
 * 组合输入更新事件对象
 */
export interface CompositionUpdateEventData {
  /** 标识在插槽的第几位触发 */
  index: number
  /** 组件数据输入的数据 */
  data: string
}

/**
 * 组件插槽设置属性事件对象
 */
export interface SlotSetAttributeEventData<T = any> {
  attribute: Attribute<T>
  value: T
}

/**
 * 组件插槽应用格式事件对象
 */
export interface SlotApplyFormatEventData<T = any> {
  formatter: Formatter<T>
  value: T
}

/**
 * 上下文本菜单配置项
 */
export interface ContextMenuItem {
  type: string
  disabled?: boolean

  onClick(): void
}

/**
 * 自定义上下文本菜单配置项
 */
export interface ContextMenuCustomItem<T = unknown> {
  type: string
  value?: T
  disabled?: boolean

  validate?(value: T): true | string

  onComplete(value: T): void
}

/**
 * 上下文多级菜单配置项
 */
export interface ContextMenuGroup {
  type: string
  disabled?: boolean
  submenu: Array<ContextMenuItem | ContextMenuCustomItem>
}

export type ContextMenuConfig = ContextMenuGroup | ContextMenuItem

export interface SlotRange {
  slot: Slot
  startIndex: number
  endIndex: number
}

export interface EventTypes {
  onUnselect: () => void
  onSelected: () => void
  onFocus: () => void
  onBlur: () => void
  onFocusIn: () => void
  onFocusOut: () => void
  onDestroy: () => void
  onParentSlotUpdated: () => void
  onSelectionFromFront: (event: Event<Component>) => void
  onSelectionFromEnd: (event: Event<Component>) => void
  onBreak: (event: Event<Slot, BreakEventData>) => void
  onPaste: (event: Event<Slot, PasteEventData>) => void
  onContextMenu: (event: ContextMenuEvent<Component>) => void

  onContentInserted: (event: Event<Slot, InsertEventData>) => void
  onContentInsert: (event: Event<Slot, InsertEventData>) => void
  onContentDelete: (event: Event<Slot, DeleteEventData>) => void
  onContentDeleted: (event: Event<Slot>) => void

  onGetRanges: (event: GetRangesEvent<Component>) => void
  onCompositionStart: (event: Event<Slot, CompositionStartEventData>) => void
  onCompositionUpdate: (event: Event<Slot, CompositionUpdateEventData>) => void
  onCompositionEnd: (event: Event<Slot>) => void

  onSlotSetAttribute: (event: Event<Slot, SlotSetAttributeEventData>) => void
  onSlotApplyFormat: (event: Event<Slot, SlotApplyFormatEventData>) => void
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

interface ComponentContext {
  textbus: Textbus
  componentInstance: Component
  // dynamicShortcut: Shortcut[]
  eventCache: EventCache<EventTypes>
}

const eventCacheMap = new WeakMap<Component, EventCache<EventTypes>>()
const contextStack: ComponentContext[] = []

function getCurrentContext() {
  const current = contextStack[contextStack.length - 1]
  if (!current) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  return current
}

/**
 * 组件 setup 方法内获取编辑器 IoC 容器的勾子
 */
export function useContext(): Textbus
export function useContext<T>(token: Type<T> | AbstractType<T> | InjectionToken<T>, notFoundValue?: T, flags?: InjectFlags): T
export function useContext(token: any = Textbus, noFoundValue?: any, flags?: any) {
  const context = getCurrentContext()
  return context.textbus.get(token, noFoundValue, flags)
}

/**
 * 组件 setup 方法内获取组件实例的勾子
 */
export function useSelf<T extends Component>(): T {
  const context = getCurrentContext()
  return context.componentInstance as T
}

/**
 * 组件注册动态快捷键的勾子
 * @param config
 */
export function useDynamicShortcut(config: Shortcut) {
  const context = getCurrentContext()
  context.componentInstance.shortcutList.push(config)
}

/**
 * Textbus 事件对象
 */
export class Event<S, T = null> {
  get isPrevented() {
    return this._isPrevented
  }

  private _isPrevented = false

  constructor(public target: S,
              public data: T,
  ) {
  }

  preventDefault() {
    this._isPrevented = true
  }
}

export class ContextMenuEvent<T> extends Event<T> {
  constructor(target: T,
              private getMenus: (menus: ContextMenuConfig[]) => void) {
    super(target, null)
  }

  get stopped() {
    return this.isStopped
  }

  private isStopped = false

  stopPropagation() {
    this.isStopped = true
  }

  useMenus(menus: ContextMenuConfig[]) {
    this.getMenus(menus)
  }
}

export class GetRangesEvent<T> extends Event<T> {
  constructor(target: T,
              private getRanges: (ranges: SlotRange[]) => void) {
    super(target, null)
  }

  useRanges(ranges: SlotRange[]) {
    this.getRanges(ranges)
  }
}

/**
 * 触发组件事件的方法
 * @param target 目标组件
 * @param eventType 事件名
 * @param event 事件对象
 */
export function invokeListener(target: Component, eventType: 'onSelectionFromFront', event: Event<Component>): void
export function invokeListener(target: Component, eventType: 'onSelectionFromEnd', event: Event<Component>): void
export function invokeListener(target: Component, eventType: 'onContentInsert', event: Event<Slot, InsertEventData>): void
export function invokeListener(target: Component, eventType: 'onContentInserted', event: Event<Slot, InsertEventData>): void
export function invokeListener(target: Component, eventType: 'onContentDelete', event: Event<Slot, DeleteEventData>): void
export function invokeListener(target: Component, eventType: 'onContentDeleted', event: Event<Slot>): void
export function invokeListener(target: Component, eventType: 'onBreak', event: Event<Slot, BreakEventData>): void
export function invokeListener(target: Component, eventType: 'onContextMenu', event: ContextMenuEvent<Component>): void
export function invokeListener(target: Component, eventType: 'onPaste', event: Event<Slot, PasteEventData>): void
export function invokeListener(target: Component, eventType: 'onGetRanges', event: GetRangesEvent<Component>): void
// eslint-disable-next-line max-len
export function invokeListener(target: Component, eventType: 'onCompositionStart', event: Event<Slot, CompositionStartEventData>): void
// eslint-disable-next-line max-len
export function invokeListener(target: Component, eventType: 'onCompositionUpdate', event: Event<Slot, CompositionUpdateEventData>): void
export function invokeListener(target: Component, eventType: 'onSlotSetAttribute', event: Event<Slot, SlotSetAttributeEventData>): void
export function invokeListener(target: Component, eventType: 'onSlotApplyFormat', event: Event<Slot, SlotApplyFormatEventData>): void
export function invokeListener(target: Component, eventType: 'onCompositionEnd', event: Event<Slot>): void
export function invokeListener(target: Component, eventType: 'onSelected'): void
export function invokeListener(target: Component, eventType: 'onUnselect'): void
export function invokeListener(target: Component, eventType: 'onFocus'): void
export function invokeListener(target: Component, eventType: 'onBlur'): void
export function invokeListener(target: Component, eventType: 'onFocusIn'): void
export function invokeListener(target: Component, eventType: 'onFocusOut'): void
export function invokeListener(target: Component, eventType: 'onDestroy'): void
export function invokeListener(target: Component, eventType: 'onParentSlotUpdated'): void
export function invokeListener<K extends keyof EventTypes,
  D = EventTypes[K] extends (args: infer U) => any ?
    U extends Event<any> ? U : never
    : never>(target: Component, eventType: K, event?: D) {
  if (typeof target !== 'object' || target === null) {
    return
  }
  const cache = eventCacheMap.get(target)
  if (cache) {
    const callbacks = cache.get(eventType)
    callbacks.forEach(fn => {
      return (fn as any)(event)
    })
    if (eventType === 'onDestroy') {
      eventCacheMap.delete(target)
    }
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
 * 根据组件触发上下文菜单
 * @param component
 */
export function triggerContextMenu(component: Component) {
  let comp: Component | null = component
  const menuItems: ContextMenuConfig[][] = []
  while (comp) {
    const event = new ContextMenuEvent<Component>(comp, (menus: ContextMenuConfig[]) => {
      menuItems.push(menus)
    })
    invokeListener(
      comp as Component,
      'onContextMenu',
      event
    )
    if (event.stopped) {
      break
    }
    comp = comp.parent?.parent || null
  }
  return menuItems
}

/**
 * 当已选中组件未选中或选区不只选中已选中组件时触发
 */
export const onUnselect = makeEventHook('onUnselect')

/**
 * 当选区刚好选中一个组件
 */
export const onSelected = makeEventHook('onSelected')

/**
 * 当光标从前面进入组件
 */
export const onSelectionFromFront = makeEventHook('onSelectionFromFront')

/**
 * 当光标从后面进入组件
 */
export const onSelectionFromEnd = makeEventHook('onSelectionFromEnd')

/**
 * 组件获取焦点事件的勾子
 */
export const onFocus = makeEventHook('onFocus')

/**
 * 组件失去焦点事件的勾子
 */
export const onBlur = makeEventHook('onBlur')

/**
 * 组件或子组件获取焦点事件的勾子
 */
export const onFocusIn = makeEventHook('onFocusIn')

/**
 * 组件或子组件失去焦点事件的勾子
 */
export const onFocusOut = makeEventHook('onFocusOut')

/**
 * 组件内粘贴事件勾子
 */
export const onPaste = makeEventHook('onPaste')

/**
 * 组件右键菜单事件勾子
 */
export const onContextMenu = makeEventHook('onContextMenu')

/**
 * 组件子插槽内容删除时的勾子
 */
export const onContentDelete = makeEventHook('onContentDelete')

/**
 * 组件子插槽内容删除完成时的勾子
 */
export const onContentDeleted = makeEventHook('onContentDeleted')

/**
 * 组件子插槽换行时的勾子
 */
export const onBreak = makeEventHook('onBreak')

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
/**
 * 当组件为选区公共父组件时的勾子
 */
export const onGetRanges = makeEventHook('onGetRanges')
/**
 * 当插槽组合输入前触发
 */
export const onCompositionStart = makeEventHook('onCompositionStart')
/**
 * 当插槽组合输入时触发
 */
export const onCompositionUpdate = makeEventHook('onCompositionUpdate')
/**
 * 当插槽组合输入结束触发
 */
export const onCompositionEnd = makeEventHook('onCompositionEnd')
/**
 * 当组件的父插槽数据发生更新后触发
 */
export const onParentSlotUpdated = makeEventHook('onParentSlotUpdated')
/**
 * 当组件插槽设置属性时触发
 */
export const onSlotSetAttribute = makeEventHook('onSlotSetAttribute')
/**
 * 当组件插槽应用格式时触发
 */
export const onSlotApplyFormat = makeEventHook('onSlotApplyFormat')
