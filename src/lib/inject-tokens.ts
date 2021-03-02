import { InjectionToken } from '@tanbo/di';
import { EditorOptions } from './editor-options';

export const EDITOR_OPTIONS = new InjectionToken<EditorOptions<any>>('EDITOR_OPTIONS');
export const EDITABLE_DOCUMENT = new InjectionToken<Document>('EDITABLE_DOCUMENT');
export const EDITABLE_DOCUMENT_CONTAINER = new InjectionToken<HTMLElement>('EDITABLE_DOCUMENT_CONTAINER');
export const EDITOR_SCROLL_CONTAINER = new InjectionToken<HTMLElement>('EDITOR_SCROLL_CONTAINER');
