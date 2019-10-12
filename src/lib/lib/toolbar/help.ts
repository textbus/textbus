import { Observable } from 'rxjs';

import { Formatter } from '../edit-frame/fomatter/formatter';
import { Matcher, MatchDelta, MatchState } from '../matcher';
import { EventDelegate } from '../help';
import { EditFrame, Hooks } from '../edit-frame/edit-frame';

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

  canUse?(range: Range, frame: EditFrame, matchState: MatchState): boolean;
}

export interface Commander {
  execCommand: Formatter;
}

export interface ButtonHandlerOption extends Commander {
  type: HandlerType.Button;
  match?: FormatMatch;
  label?: string;
  classes?: string[];
  tooltip?: string;
  hooks?: Hooks;
}

export interface SelectHandlerItemOption extends Commander {
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
  hooks?: Hooks;
}

export interface DropdownHandlerView {
  elementRef: HTMLElement | DocumentFragment;

  updateStateByElement(el: HTMLElement): void;

  reset?(): void;

  setEventDelegator?(delegate: EventDelegate): void;
}

export interface DropdownHandlerOption extends Commander {
  type: HandlerType.Dropdown;
  viewer: DropdownHandlerView;
  onHide: Observable<void>;
  classes?: string[];
  format?: string;
  tooltip?: string;
  label?: string;
  match?: FormatMatch;
  hooks?: Hooks;
}

export interface ActionSheetHandlerItemOption extends Commander {
  label: string;
  match?: FormatMatch;
  classes?: string[];
}

export interface ActionSheetHandlerOption {
  type: HandlerType.ActionSheet;
  actions: ActionSheetHandlerItemOption[];
  classes?: string[];
  tooltip?: string;
  hooks?: Hooks;
}

export interface Handler {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  matcher: Matcher;
  execCommand: Formatter;
  updateStatus(desc: MatchDelta): void;
}

export type HandlerOption =
  DropdownHandlerOption
  | ButtonHandlerOption
  | SelectHandlerOption
  | ActionSheetHandlerOption;
