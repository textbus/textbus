import { Observable } from 'rxjs';

import { HandlerOption } from './toolbar/help';
import { MatchDelta } from './matcher';

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
  onInit?(frameContainer: HTMLElement, context: EditContext): void;
  onApply?(range: Range, matchDelta: MatchDelta, context: EditContext): Range | Range[];
  onOutput?(head: HTMLHeadElement, body: HTMLBodyElement): void;
}
