import { Draft } from 'immer'

import { VElement } from './element'
import { ContentType, Slot } from './slot'
import { Slots } from './slots'
import { ChangeMarker } from './change-marker'

export interface ComponentLiteral<State = any> {
  name: string
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
export interface ComponentMethods<State = any> {
  render: ComponentRender

  toJSON(): State
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
export interface ComponentInstance<Methods extends ComponentMethods<State> = ComponentMethods, State = any> {
  /** 组件所在的插槽 */
  parent: Slot | null
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
