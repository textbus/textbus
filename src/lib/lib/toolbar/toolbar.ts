import {
  ButtonHandlerOption,
  DropdownHandlerOption,
  HandlerOption,
  HandlerType,
  SelectHandlerOption
} from './help';
import { Handler } from './handlers/help';
import { SelectHandler } from './handlers/select-handler';
import { ButtonHandler } from './handlers/button-handler';

export class Toolbar {
  readonly host = document.createElement('div');
  readonly handlers: Array<Handler> = [];

  private isFirst = true;

  constructor() {
    this.host.classList.add('tanbo-editor-toolbar');
  }

  addHandler(option: HandlerOption) {
    this.isFirst = false;
    if (option.type === HandlerType.Button) {
      this.addButtonHandler(option);
    } else if (option.type === HandlerType.Select) {
      this.addSelectHandler(option);
    } else if (option.type === HandlerType.Dropdown) {
      this.addDropdownHandler(option);
    }
  }

  addGroup(handlers: HandlerOption[]) {
    if (!this.isFirst) {
      this.host.appendChild(Toolbar.createSplitLine());
    }
    handlers.forEach(handler => {
      this.addHandler(handler);
    });
  }

  private addButtonHandler(option: ButtonHandlerOption) {
    const button = new ButtonHandler(option);
    this.handlers.push(button);
    this.host.appendChild(button.host);
  }

  private addSelectHandler(handler: SelectHandlerOption) {
    const select = new SelectHandler(handler);
    this.handlers.push(select);
    this.host.appendChild(select.host);
  }

  private addDropdownHandler(handler: DropdownHandlerOption) {
    // this.
  }

  private static createSplitLine() {
    const splitLine = document.createElement('span');
    splitLine.classList.add('tanbo-editor-toolbar-split-line');
    return splitLine;
  }
}
