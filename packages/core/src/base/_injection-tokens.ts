import { Injectable, InjectionToken } from '@viewfly/core'
import { Observable } from '@tanbo/stream'

import { Component, Formatter, ComponentConstructor, Attribute } from '../model/_api'
import { AbstractSelection } from './selection'

/**
 * 根节点及原生根元素节点引用类
 */
export abstract class RootComponentRef {
  abstract component: Component
}

/**
 * @internal Textbus 组件列表注入 token
 */
export const COMPONENT_LIST = new InjectionToken<ComponentConstructor[]>('COMPONENT_LIST')
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

@Injectable()
export class SelectionCorrector {
  beforeChange(abstractSelection: AbstractSelection): AbstractSelection | null {
    return abstractSelection
  }
}
