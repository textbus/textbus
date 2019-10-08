import { Observable, of, Subject, from } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';

import { EditFrame } from './edit-frame/edit-frame';
import { EditorOptions, EventDelegate } from './help';
import { Paths } from './paths/paths';
import {
  ButtonHandlerOption,
  DropdownHandlerOption,
  HandlerOption,
  HandlerType,
  SelectHandlerOption,
  Handler,
  ActionSheetHandlerOption
} from './toolbar/help';
import { ButtonHandler } from './toolbar/button-handler';
import { SelectHandler } from './toolbar/select-handler';
import { TBRange } from './range';
import { DropdownHandler } from './toolbar/dropdown-handler';
import { ActionSheetHandler } from './toolbar/action-sheet-handler';

export class Editor implements EventDelegate {
  readonly host = document.createElement('div');
  readonly editor: EditFrame;
  readonly paths = new Paths();
  readonly onReady: Observable<this>;

  private toolbar = document.createElement('div');
  private container: HTMLElement;
  private readyEvent = new Subject<this>();
  private isFirst = true;
  private handlers: Handler[] = [];
  private readyState = false;

  constructor(selector: string | HTMLElement, private options: EditorOptions = {}) {
    this.editor = new EditFrame(options.historyStackSize);
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
    if (Array.isArray(options.handlers)) {
      options.handlers.forEach(handler => {
        if (Array.isArray(handler)) {
          this.addGroup(handler);
        } else {
          this.addHandler(handler);
        }
      });
    }

    this.onReady = this.readyEvent.asObservable();

    this.toolbar.classList.add('tanbo-editor-toolbar');

    this.host.appendChild(this.toolbar);
    this.host.appendChild(this.editor.elementRef);
    this.host.appendChild(this.paths.elementRef);

    this.host.classList.add('tanbo-editor-container');
    this.container.appendChild(this.host);

    this.paths.onCheck.subscribe(node => {
      this.editor.updateSelectionByElement(node);
    });
    this.editor.onSelectionChange.pipe(debounceTime(10)).subscribe(() => {
      const event = document.createEvent('Event');
      event.initEvent('click', true, true);
      this.editor.elementRef.dispatchEvent(event);
      this.updateToolbarStatus();
    });
    this.editor.onSelectionChange
      .pipe(map(() => {
        this.readyState = true;
        return this.editor.contentDocument.getSelection().getRangeAt(0).endContainer;
      }), distinctUntilChanged()).subscribe(node => {
      this.paths.update(node as Element);
    });
    this.editor.onLoad.subscribe(() => {
      this.readyEvent.next(this);
    });
  }

  addHandler(option: HandlerOption) {
    this.isFirst = false;
    switch (option.type) {
      case HandlerType.Button:
        this.addButtonHandler(option);
        break;
      case HandlerType.Select:
        this.addSelectHandler(option);
        break;
      case HandlerType.Dropdown:
        this.addDropdownHandler(option);
        break;
      case HandlerType.ActionSheet:
      this.addActionSheetHandler(option);
    }
  }

  addGroup(handlers: HandlerOption[]) {
    if (!this.isFirst) {
      this.toolbar.appendChild(Editor.createSplitLine());
    }
    handlers.forEach(handler => {
      this.addHandler(handler);
    });
  }

  dispatchEvent(type: string): Observable<string> {
    if (typeof this.options.uploader === 'function') {
      const result = this.options.uploader(type);
      if (result instanceof Observable) {
        return result;
      } else if (result instanceof Promise) {
        return from(result);
      } else if (typeof result === 'string') {
        return of(result);
      }
    }
    return of('');
  }

  private updateToolbarStatus() {
    const doc = this.editor.contentDocument;
    const range = doc.getSelection().getRangeAt(0);
    this.handlers.forEach(handler => {
      handler.updateStatus(handler.matcher.match(this.editor, range));
    });
  }

  private addButtonHandler(option: ButtonHandlerOption) {
    const button = new ButtonHandler(option);
    button.onApply.pipe(filter(() => this.readyState)).subscribe(() => {
      const doc = this.editor.contentDocument;
      const range = new TBRange(doc.getSelection().getRangeAt(0), doc);
      option.execCommand.format(range, this.editor, button.matcher.match(this.editor, range.rawRange));
      if (option.execCommand.recordHistory) {
        this.editor.recordSnapshot();
      } else {
        doc.body.focus();
      }
    });
    this.toolbar.appendChild(button.elementRef);
    this.handlers.push(button);
  }

  private addSelectHandler(option: SelectHandlerOption) {
    const select = new SelectHandler(option);
    select.options.forEach(item => {
      item.onApply.pipe(filter(() => this.readyState)).subscribe(() => {
        const doc = this.editor.contentDocument;
        const range = new TBRange(doc.getSelection().getRangeAt(0), doc);
        item.execCommand.format(range, this.editor, item.matcher.match(this.editor, range.rawRange));

        if (item.execCommand.recordHistory) {
          this.editor.recordSnapshot();
        } else {
          doc.body.focus();
        }
      });
      this.handlers.push(item);
    });
    this.toolbar.appendChild(select.elementRef);
  }

  private addDropdownHandler(handler: DropdownHandlerOption) {
    const dropdown = new DropdownHandler(handler, this);
    this.toolbar.appendChild(dropdown.elementRef);
    dropdown.onApply.pipe(filter(() => this.readyState)).subscribe(() => {
      const doc = this.editor.contentDocument;
      const range = new TBRange(doc.getSelection().getRangeAt(0), doc);
      handler.execCommand.format(range, this.editor, dropdown.matcher.match(this.editor, range.rawRange));

      if (handler.execCommand.recordHistory) {
        this.editor.recordSnapshot();
      } else {
        doc.body.focus();
      }
    });
    this.handlers.push(dropdown);
  }

  private addActionSheetHandler(handler: ActionSheetHandlerOption) {
    const actionSheet = new ActionSheetHandler(handler);
    this.toolbar.appendChild(actionSheet.elementRef);
    actionSheet.options.forEach(item => {
      item.onApply.pipe(filter(() => this.readyState)).subscribe(() => {
        const doc = this.editor.contentDocument;
        const range = new TBRange(doc.getSelection().getRangeAt(0), doc);
        item.execCommand.format(range, this.editor, item.matcher.match(this.editor, range.rawRange));

        if (item.execCommand.recordHistory) {
          this.editor.recordSnapshot();
        } else {
          doc.body.focus();
        }
      });
      this.handlers.push(item);
    });
  }

  private static createSplitLine() {
    const splitLine = document.createElement('span');
    splitLine.classList.add('tanbo-editor-split-line');
    return splitLine;
  }
}
