import { Editor } from '../editor/editor';

export interface ButtonHandler {
  type: 'button';
  tags: string[];
  label?: string;
  format?: string;
  tooltip?: string;

  execCommand(editor: Editor): void;
}

export interface SelectHandlerOption {
  tags: string[];
  format?: string;
  label?: string;
  normal?: boolean;
}

export interface SelectHandler {
  type: 'select';
  options: SelectHandlerOption[];
  format?: string;
  tooltip?: string;

  execCommand(option: SelectHandlerOption, editor: Editor): void;
}

export interface DropdownHandler {
  type: 'dropdown';
  options: ButtonHandler[];
  format?: string;
}

export type Handler = DropdownHandler | ButtonHandler | SelectHandler;
