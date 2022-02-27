import { BehaviorSubject } from '@tanbo/stream'
import { InjectionToken } from '@tanbo/di'

import { BaseEditorOptions } from './types'

/**
 * 编辑器可选项依赖注入 token
 */
export const EDITOR_OPTIONS = new InjectionToken<BaseEditorOptions>('EDITOR_OPTIONS')
/**
 * 编辑器 Document 依赖注入 token
 */
export const EDITABLE_DOCUMENT = new InjectionToken<Document>('EDITABLE_DOCUMENT')

/**
 * 编辑器容器依赖注入 token
 */
export const EDITOR_CONTAINER = new InjectionToken<HTMLElement>('EDITOR_CONTAINER')

/**
 * 编辑器容器依赖注入 token
 */
export const DOC_CONTAINER = new InjectionToken<HTMLElement>('DOC_CONTAINER')

/**
 * 编辑器容器遮罩层 token
 */
export const EDITOR_MASK = new InjectionToken<HTMLElement>('EDITOR_MASK')

export const RESIZE_OBSERVER = new InjectionToken<BehaviorSubject<DOMRect>>('RESIZE_OBSERVER')
