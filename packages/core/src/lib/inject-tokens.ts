import { InjectionToken } from '@tanbo/di';
import { EditorOptions } from './editor-options';

/**
 * 编辑器可选项依赖注入 key
 */
export const EDITOR_OPTIONS = new InjectionToken<EditorOptions>('EDITOR_OPTIONS');
/**
 * 编辑器 Document 依赖注入 key
 */
export const EDITABLE_DOCUMENT = new InjectionToken<Document>('EDITABLE_DOCUMENT');


