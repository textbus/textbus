import { Editor } from '../editor/editor';
import {
  ButtonHandler,
  DropdownHandler,
  Handler,
  HandlerType,
  SelectHandler
} from './help';
import { Matcher } from '../matcher';
import { TBRange } from '../range';

export class Toolbar {
  readonly host = document.createElement('div');
  private isFirst = true;
  private checkers: Array<(range: Range) => void> = [];
  private range: Range;

  constructor(private editor: Editor) {
    this.host.classList.add('tanbo-editor-toolbar');
    this.editor.onSelectionChange.subscribe(range => {
      this.range = range;
      this.checkers.forEach(fn => fn(range));
    });
  }

  addHandler(handler: Handler) {
    this.isFirst = false;
    if (handler.type === HandlerType.Button) {
      this.addButtonHandler(handler);
    } else if (handler.type === HandlerType.Select) {
      this.addSelectHandler(handler);
    } else if (handler.type === HandlerType.Dropdown) {
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
    const matcher = new Matcher(this.editor, handler.match);
    action.addEventListener('click', () => {
      if (this.editor.contentDocument) {
        const r = new TBRange(this.range, this.editor.contentDocument);
        handler.execCommand.format(r, this.editor, matcher.match(r));
      }
    });
    // this.checkers.push(function (range) {
    //   const {matchAllChild, inContainer} = matcher.match(range);
    //   if (matchAllChild || inContainer) {
    //     action.classList.add('tanbo-editor-toolbar-handler-active');
    //   } else {
    //     action.classList.remove('tanbo-editor-toolbar-handler-active');
    //   }
    // });
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
      const matcher = new Matcher(this.editor, option.match);
      item.addEventListener('click', () => {
        if (this.editor.contentDocument) {
          const r = new TBRange(this.range, this.editor.contentDocument);
          option.execCommand.format(r, this.editor, matcher.match(r));
        }
      });
      dropdownMenu.appendChild(item);
      // this.checkers.push(range => {
      //   const {matchAllChild, inContainer} = matcher.match(range);
      //   if (matchAllChild || inContainer) {
      //     dropdownInner.innerHTML = option.label;
      //   }
      // });
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
