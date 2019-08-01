import { Editor } from '../editor/editor';

export interface ButtonHandler {
  type: 'button';
  tags?: string[];
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
