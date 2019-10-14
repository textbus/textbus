import { Observable } from 'rxjs';

import { HandlerOption } from './toolbar/help';
import { Matcher } from './matcher';

export interface EditorOptions {
  historyStackSize?: number;
  handlers?: (HandlerOption | HandlerOption[])[];
  content?: string;
  uploader?(type: string): (string | Promise<string> | Observable<string>);
  placeholder?: string;
}

export interface EventDelegate {
  dispatchEvent(type: string): Observable<string>
}

export interface EditContext {
  document: Document;
  window: Window;
}

export interface Hooks {
  matcher?: Matcher;
  setup?(frameContainer: HTMLElement, context: EditContext): void;
  onSelectionChange?(range: Range, context: EditContext): Range | Range[];
  onApplied?(frameContainer: HTMLElement, context: EditContext): void;
  onOutput?(head: HTMLHeadElement, body: HTMLBodyElement): void;
}
