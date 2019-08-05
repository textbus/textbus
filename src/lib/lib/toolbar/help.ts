import { Editor } from '../editor/editor';

export interface FormatMatchStyles {
  [key: string]: number | string;
}

export interface FormatAttrs {
  [key: string]: any;
}

export interface FormatMatch {
  tags?: string[];
  styles?: FormatMatchStyles;
  classes?: string[];
  attrs?: FormatAttrs;
}

export interface ButtonHandler {
  type: 'button';
  match?: FormatMatch;
  label?: string;
  classes?: string[];
  tooltip?: string;

  execCommand(editor: Editor): void;
}

export interface SelectHandlerOption {
  tags?: string[];
  classes?: string[];
  label?: string;
  default?: boolean;
}

export interface SelectHandler {
  type: 'select';
  options: SelectHandlerOption[];
  classes?: string[];
  tooltip?: string;

  execCommand(option: SelectHandlerOption, editor: Editor): void;
}

export interface DropdownHandler {
  type: 'dropdown';
  options: ButtonHandler[];
  format?: string;
}

export type Handler = DropdownHandler | ButtonHandler | SelectHandler;
