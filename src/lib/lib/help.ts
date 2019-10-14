import { Observable } from 'rxjs';

import { HandlerOption } from './toolbar/help';
import { Matcher } from './matcher';
import { Formatter } from './edit-frame/fomatter/formatter';

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

  onApply?(range: Range, formatter: Formatter, context: EditContext): boolean;

  onApplied?(frameContainer: HTMLElement, context: EditContext): void;

  onOutput?(head: HTMLHeadElement, body: HTMLBodyElement): void;
}
