import { InjectionToken } from '@tanbo/di';
import { EditorOptions } from './editor-options';

export const EDITOR_OPTIONS = new InjectionToken<EditorOptions<any>>('EDITOR_OPTIONS');
export const EDITABLE_DOCUMENT = new InjectionToken<Document>('EDITABLE_DOCUMENT');

export const UI_SCROLL_CONTAINER = new InjectionToken<HTMLElement>('UI_SCROLL_CONTAINER');
export const UI_DOCUMENT_CONTAINER = new InjectionToken<HTMLElement>('UI_DOCUMENT_CONTAINER');
export const UI_VIEWER_CONTAINER = new InjectionToken<HTMLElement>('UI_VIEWER_CONTAINER');
export const UI_TOP_CONTAINER = new InjectionToken<HTMLElement>('UI_TOP_CONTAINER');
export const UI_RIGHT_CONTAINER = new InjectionToken<HTMLElement>('UI_RIGHT_CONTAINER');
export const UI_BOTTOM_CONTAINER = new InjectionToken<HTMLElement>('UI_BOTTOM_CONTAINER');

