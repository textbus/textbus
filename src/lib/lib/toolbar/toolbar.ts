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
  readonly host = document.createElement('div');

  constructor(private editor: T) {
    this.host.classList.add('tanbo-editor-toolbar')
  }

  addHandler(handler: Handler<T>) {
    const action = document.createElement('button');
    action.type = 'button';
    action.classList.add('tanbo-editor-toolbar-handler', handler.format);
    if(action.type === 'button') {
      action.addEventListener('click', () => {
        (handler as ButtonHandler<T>).handler(this.editor);
      });
    }
    this.host.appendChild(action);
  }

  addGroup(handlers: Handler<T>[]) {

  }
}
