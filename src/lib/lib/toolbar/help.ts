import { Observable } from 'rxjs';

import { Formatter } from '../edit-frame/fomatter/formatter';
import { Matcher, MatchDescription, MatchStatus } from '../matcher';
import { EventDelegate } from '../help';
import { EditFrame } from '../edit-frame/edit-frame';

export enum HandlerType {
  Button,
  Select,
  Dropdown,
  ActionSheet
}

export interface FormatMatchStyles {
  [key: string]: number | string | RegExp | Array<number | string | RegExp>;
}

export interface FormatAttr {
  key: string;
  value?: string | string[];
}

export interface FormatMatch {
  tags?: string[];
  styles?: FormatMatchStyles;
  classes?: string[];
  attrs?: FormatAttr[];

  canUse?(range: Range, frame: EditFrame, matchStatus: MatchStatus): boolean;
}

export interface ButtonHandlerOption {
  type: HandlerType.Button;
  execCommand: Formatter;
  match?: FormatMatch;
  label?: string;
  classes?: string[];
  tooltip?: string;
}

export interface SelectHandlerItemOption {
  execCommand: Formatter;
  label: string;
  match?: FormatMatch;
  classes?: string[];
  default?: boolean;
}

export interface SelectHandlerOption {
  type: HandlerType.Select
  options: SelectHandlerItemOption[];
  classes?: string[];
  tooltip?: string;
}

export interface DropdownHandlerView {
  elementRef: HTMLElement | DocumentFragment;

  updateStateByElement(el: HTMLElement): void;

  reset?(): void;

  setEventDelegator?(delegate: EventDelegate): void;
}

export interface DropdownHandlerOption {
  type: HandlerType.Dropdown;
  viewer: DropdownHandlerView;
  execCommand: Formatter;
  onHide: Observable<void>;
  classes?: string[];
  format?: string;
  tooltip?: string;
  label?: string;
  match?: FormatMatch;
}

export interface ActionSheetHandlerItemOption {
  execCommand: Formatter;
  label: string;
  match?: FormatMatch;
  classes?: string[];
}

export interface ActionSheetHandlerOption {
  type: HandlerType.ActionSheet;
  actions: ActionSheetHandlerItemOption[];
  classes?: string[];
  tooltip?: string;
}

export interface Handler {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  matcher: Matcher;

  updateStatus(status: MatchDescription): void;
}

export type HandlerOption =
  DropdownHandlerOption
  | ButtonHandlerOption
  | SelectHandlerOption
  | ActionSheetHandlerOption;
