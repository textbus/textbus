import { Textbus } from '../textbus'
import { AbstractType, InjectFlags, InjectionToken, Type } from '@viewfly/core'
import { Shortcut } from './types'
import { Component } from './component'

import { getCurrentContext } from './setup'

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
