import { InjectionToken } from '@viewfly/core'
import { Observable } from '@tanbo/stream'

import { ComponentInstance, Formatter, Component, Attribute } from '../model/_api'

/**
 * 根节点及原生根元素节点引用类
 */
export abstract class RootComponentRef {
  abstract component: ComponentInstance
}

export abstract class ViewAdapter {
  abstract onViewUpdated: Observable<void>
  abstract copy(): void
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
