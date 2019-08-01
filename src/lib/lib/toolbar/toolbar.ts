import { Editor } from '../editor/editor';
import { ButtonHandler, DropdownHandler, Handler, SelectHandler, SelectHandlerOption } from './help';

export class Toolbar {
  readonly host = document.createElement('div');
  private isFirst = true;
  private checkers: Array<(paths: string[]) => void> = [];

  constructor(private editor: Editor) {
    this.host.classList.add('tanbo-editor-toolbar');
    this.editor.onSelectionChange.subscribe(node => {
      const paths: string[] = [];
      let ele = node.focusNode;
      while (ele) {
        paths.push(ele.nodeName);
        ele = ele.parentNode;
      }
      this.checkers.forEach(fn => fn(paths));
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
    action.classList.add('tanbo-editor-toolbar-handler', ...(handler.classes || []));
    action.addEventListener('click', () => {
      if (this.editor.contentDocument) {
        handler.execCommand(this.editor);
      }
    });
    this.checkers.push(function (paths: string[]) {
      let isFind = false;
      for (const path of paths) {
        if ((handler.tags || []).indexOf(path) > -1) {
          isFind = true;
          break;
        }
      }

      if (isFind) {
        action.classList.add('tanbo-editor-toolbar-handler-active');
      } else {
        action.classList.remove('tanbo-editor-toolbar-handler-active');
      }
    });
    this.host.appendChild(action);
  }

  private addSelectHandler(handler: SelectHandler) {
    const dropdown = document.createElement('span');
    dropdown.classList.add('tanbo-editor-toolbar-dropdown');

    const dropdownButton = document.createElement('button');
    dropdownButton.type = 'button';
    dropdownButton.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    dropdownButton.classList.add('tanbo-editor-toolbar-handler');
    dropdownButton.classList.add('tanbo-editor-toolbar-dropdown-button');

    const dropdownInner = document.createElement('span');
    const dropdownArrow = document.createElement('span');
    dropdownArrow.classList.add('tanbo-editor-toolbar-dropdown-button-caret');

    dropdownButton.appendChild(dropdownInner);
    dropdownButton.appendChild(dropdownArrow);
    let isSelfClick = false;
    document.addEventListener('click', () => {
      if (!isSelfClick) {
        dropdown.classList.remove('tanbo-editor-toolbar-dropdown-open');
      }
      isSelfClick = false;
    });
    dropdownButton.addEventListener('click', () => {
      isSelfClick = true;
      dropdown.classList.toggle('tanbo-editor-toolbar-dropdown-open');
    });

    const dropdownMenu = document.createElement('div');
    dropdownMenu.classList.add('tanbo-editor-toolbar-dropdown-menu');
    handler.options.forEach(option => {
      const item = document.createElement('button');
      item.classList.add('tanbo-editor-toolbar-dropdown-menu-item');
      item.type = 'button';
      if (option.classes) {
        item.classList.add(...(option.classes || []));
      }
      item.innerText = option.label;
      item.addEventListener('click', () => {
        if (this.editor.contentDocument) {
          handler.execCommand(option, this.editor);
        }
      });
      dropdownMenu.appendChild(item);

    });
    this.checkers.push((paths: string[]) => {
      let selectedOption: SelectHandlerOption;
      for (const option of handler.options) {
        for (const path of paths) {
          if ((option.tags || []).indexOf(path) > -1) {
            selectedOption = option;
            break;
          }
        }
        if (selectedOption) {
          break;
        }
      }
      if (!selectedOption) {
        for (const option of handler.options) {
          if (option.default) {
            selectedOption = option;
          }
        }
      }
      if (selectedOption) {
        dropdownInner.innerHTML = selectedOption.label;
      }
    });

    dropdown.appendChild(dropdownButton);
    dropdown.appendChild(dropdownMenu);
    this.host.appendChild(dropdown);
    this.editor.onSelectionChange.subscribe(() => {
      dropdown.classList.remove('tanbo-editor-toolbar-dropdown-open');
    });
  }

  private addDropdownHandler(handler: DropdownHandler) {
    // this.
  }

  private createSplitLine() {
    const splitLine = document.createElement('span');
    splitLine.classList.add('tanbo-editor-toolbar-split-line');
    return splitLine;
  }
}
