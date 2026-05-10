import { Type } from '@viewfly/core'

import { ContentType, Slot } from './slot'
import { ChangeMarker } from '../observable/change-marker'
import type { ToLiteral } from './to-literal'
import { Shortcut, State, RawKeyAgent } from './types'
import { Textbus } from '../textbus'
import { observe } from '../observable/observe'
import { objectToJSON } from '../observable/util'
import { detachModel } from '../observable/help'

/**
 * 组件 JSON 字面量接口
 */
export interface ComponentLiteral<State = any> {
  name: string
  state: ToLiteral<State>
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
   * 当光标在组件右侧向前删除，或光标在组件左侧向后删除时，组件是否作为一个整体进行删除，而不是续接内容到组件内（如果有的话）
   */
  deleteAsWhole?: boolean

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
  readonly changeMarker = new ChangeMarker(this)
  readonly __changeMarker__ = this.changeMarker

  textbus: Textbus | null = null

  constructor(initData: T) {
    const {componentName, type} = this.constructor as ComponentConstructor
    this.name = componentName
    this.type = type
    this.state = observe(initData)
    const stateChangeMarker = this.state.__changeMarker__ as ChangeMarker
    stateChangeMarker.parentModel = this
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
