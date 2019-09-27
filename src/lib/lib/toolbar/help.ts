import { Observable } from 'rxjs';

import { Formatter } from '../editor/fomatter/formatter';
import { Matcher, MatchStatus } from '../matcher';

export enum HandlerType {
  Button,
  Select,
  Dropdown
}

export interface FormatMatchStyles {
  [key: string]: number | string | Array<number | string>;
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

export interface DropdownHandlerOption {
  type: HandlerType.Dropdown;
  viewContents: HTMLElement | DocumentFragment;
  execCommand: Formatter;
  onHide: Observable<void>;
  classes?: string[];
  format?: string;
  tooltip?: string;
  label?: string;
  match?: FormatMatch;
}

export interface Handler {
  host: HTMLElement;
  onAction: Observable<any>;
  matcher: Matcher;

  updateStatus(status: MatchStatus): void;
}

export type HandlerOption = DropdownHandlerOption | ButtonHandlerOption | SelectHandlerOption;
