import { Formatter } from './formatter';

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

export enum HandlerType {
  Button,
  Select,
  Dropdown
}

export interface ButtonHandler {
  type: HandlerType.Button;
  execCommand: Formatter;
  match?: FormatMatch;
  label?: string;
  classes?: string[];
  tooltip?: string;
}

export interface SelectHandlerOption {
  execCommand: Formatter;
  label: string;
  match?: FormatMatch;
  classes?: string[];
  default?: boolean;
}

export interface SelectHandler {
  type: HandlerType.Select
  options: SelectHandlerOption[];
  classes?: string[];
  tooltip?: string;
}

export interface DropdownHandler {
  type: HandlerType.Dropdown;
  classes?: string[];
  format?: string;
  tooltip?: string;
  match?: FormatMatch;
}

export type Handler = DropdownHandler | ButtonHandler | SelectHandler;
