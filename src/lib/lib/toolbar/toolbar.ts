import { Editor } from '../editor/editor';

export interface ButtonHandler {
  type: 'button';
  tags: string[];
  label?: string;
  format?: string;
  tooltip?: string;

  handler(editor: Editor): void;
}

export interface SelectHandlerOption {
  format?: string;
  label?: string;
}

export interface SelectHandler {
  type: 'select';
  options: SelectHandlerOption[];
  label?: string;
  format?: string;
  tooltip?: string;

  handler(option: SelectHandlerOption, editor: Editor): void;
}

export interface DropdownHandler {
  type: 'dropdown';
  options: ButtonHandler[];
  label?: string;
  format?: string;
  placeholder?: string;
}

export type Handler = DropdownHandler | ButtonHandler | SelectHandler;

export class Toolbar {
  readonly host = document.createElement('div');
  private isFirst = true;
  private checkers: Array<(node: Node) => void> = [];

  constructor(private editor: Editor) {
    this.host.classList.add('tanbo-editor-toolbar');
    this.editor.onSelectionChange.subscribe(node => {
      this.checkers.forEach(fn => fn(node.focusNode));
    });
  }

  addHandler(handler: Handler) {
    this.isFirst = false;
    if (handler.type === 'button') {
      this.addButtonHandler(handler);
    } else if (handler.type === 'select') {
      this.addSelectHandler(handler);
    } else if (handler.type === 'dropdown') {
      this.addDropdownHandler(handler);
    }
  }

  addGroup(handlers: Handler[]) {
    if (!this.isFirst) {
      this.host.appendChild(this.createSplitLine());
    }
    handlers.forEach(handler => {
      this.addHandler(handler);
    });
  }

  private addButtonHandler(handler: ButtonHandler) {
    const action = document.createElement('button');
    action.type = 'button';
    action.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    action.innerText = (handler.label === null || handler.label === undefined) ? '' : handler.label;
    action.classList.add('tanbo-editor-toolbar-handler', handler.format);
    action.addEventListener('click', () => {
      if (this.editor.contentDocument) {
        handler.handler(this.editor);
      }
    });
    this.checkers.push(function (node: Node) {
      const hasContain = createTagChecker(handler.tags);
      if (hasContain(node)) {
        action.classList.add('tanbo-editor-toolbar-handler-active');
      } else {
        action.classList.remove('tanbo-editor-toolbar-handler-active');
      }
    });
    this.host.appendChild(action);
  }

  private addSelectHandler(handler: SelectHandler) {

  }

  private addDropdownHandler(handler: DropdownHandler) {

  }

  private createSplitLine() {
    const splitLine = document.createElement('span');
    splitLine.classList.add('tanbo-editor-toolbar-split-line');
    return splitLine;
  }
}

function createTagChecker(tags: string[]) {
  return function (node: Node) {
    while (node) {
      if (tags.indexOf(node.nodeName) > -1) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }
}
