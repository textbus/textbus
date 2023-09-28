import { InjectionToken } from '@viewfly/core'
import { Observable } from '@tanbo/stream'

import { ComponentInstance, Formatter, Component, Attribute } from '../model/_api'
import { Textbus } from '../textbus'

/**
 * 根节点及原生根元素节点引用类
 */
export abstract class RootComponentRef {
  abstract component: ComponentInstance
}

/**
 * Textbus 渲染适配器
 */
export abstract class ViewAdapter {
  /** 当视图更新时触发事件的可观察对象，用于通知 Textbus 视图渲染已完成 */
  abstract onViewUpdated: Observable<void>
  /** 当前平台的复制能力 */
  abstract copy(): void
  /** 根组件渲染方法 */
  abstract render(rootComponent: ComponentInstance, textbus: Textbus): (void | (() => void))
}

/**
 * @internal Textbus 组件列表注入 token
 */
export const COMPONENT_LIST = new InjectionToken<Component[]>('COMPONENT_LIST')
/**
 * @internal Textbus 格式列表注入 token
 */
export const FORMATTER_LIST = new InjectionToken<Formatter<any>[]>('FORMATTER_LIST')

/**
 * @internal Textbus 插槽属性注入列表
 */
export const ATTRIBUTE_LIST = new InjectionToken<Attribute<any>[]>('ATTRIBUTE_LIST')

/**
 * 开启 Zen Coding 支持
 */
export const ZEN_CODING_DETECT = new InjectionToken<boolean>('ZEN_CODING_DETECT')

/**
 * 最大历史记录栈大小
 */
export const HISTORY_STACK_SIZE = new InjectionToken<number>('HISTORY_STACK_SIZE')

/**
 * 是否只读
 */
export const READONLY = new InjectionToken<boolean>('READONLY')

export abstract class FocusManager {
  abstract onFocus: Observable<void>
  abstract onBlur: Observable<any>
}
