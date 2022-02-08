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
