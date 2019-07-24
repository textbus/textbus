export interface ButtonHandler<T> {
  type: 'button';
  label?: string;
  format?: string;

  handler(editor: T): void;
}

export interface SelectHandlerOption {
  format?: string;
  label?: string;
}

export interface SelectHandler<T> {
  type: 'select';
  options: SelectHandlerOption[];
  label?: string;
  format?: string;

  handler(option: SelectHandlerOption, editor: T): void;
}

export interface DropdownHandler<T> {
  type: 'dropdown';
  options: ButtonHandler<T>[];
  label?: string;
  format?: string;
  placeholder?: string;
}

export type Handler<T> = DropdownHandler<T> | ButtonHandler<T> | SelectHandler<T>;

export class Toolbar<T> {
  host = document.createElement('div');

  constructor() {
  }

  addHandler(handler: Handler<T>) {
  }

  addGroup(handlers: Handler<T>[]) {

  }
}
