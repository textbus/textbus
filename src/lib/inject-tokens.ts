import { InjectionToken } from '@tanbo/di';
import { EditorOptions } from './editor-options';

export const EDITOR_OPTIONS = new InjectionToken<EditorOptions>('EDITOR_OPTIONS');
export const EDITABLE_DOCUMENT = new InjectionToken<Document>('EDITABLE_DOCUMENT');


