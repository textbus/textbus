import { InjectionToken } from '@viewfly/core'

import { ViewOptions } from './browser-module'

/**
 * 编辑器可选项依赖注入 token
 */
export const EDITOR_OPTIONS = new InjectionToken<ViewOptions>('EDITOR_OPTIONS')

/**
 * 编辑器容器依赖注入 token
 */
export const VIEW_CONTAINER = new InjectionToken<HTMLElement>('VIEW_CONTAINER')

/**
 * 编辑器容器依赖注入 token
 */
export const VIEW_DOCUMENT = new InjectionToken<HTMLElement>('VIEW_DOCUMENT')

/**
 * 编辑器容器遮罩层 token
 */
export const VIEW_MASK = new InjectionToken<HTMLElement>('VIEW_MASK')
