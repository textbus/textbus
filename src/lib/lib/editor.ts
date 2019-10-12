import { Observable, of, from, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';

import { EditFrame } from './edit-frame/edit-frame';
import { EditContext, EditorOptions, EventDelegate, Hooks } from './help';
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
import { MatchDelta } from './matcher';

export class Editor implements EventDelegate {
  onChange: Observable<string>;
  readonly elementRef = document.createElement('div');

  private readonly editor: EditFrame;
  private readonly paths = new Paths();
  private readonly toolbar = document.createElement('div');
  private readonly container: HTMLElement;
  private readonly handlers: Handler[] = [];
  private isFirst = true;
  private canApplyAction = false;

  private changeEvent = new Subject<string>();
  private tasks: Array<() => void> = [];
  private hooksList: Hooks[] = [{
    onApply(range: Range): Range | Range[] {
      return range;
    }
  }];

  private readyState = false;

  constructor(selector: string | HTMLElement, private options: EditorOptions = {}) {
    this.onChange = this.changeEvent.asObservable();
    this.editor = new EditFrame(options.historyStackSize, options.content);
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

    this.toolbar.classList.add('tanbo-editor-toolbar');

    this.elementRef.appendChild(this.toolbar);
    this.elementRef.appendChild(this.editor.elementRef);
    this.elementRef.appendChild(this.paths.elementRef);

    this.elementRef.classList.add('tanbo-editor-container');
    this.container.appendChild(this.elementRef);

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
        this.canApplyAction = true;
        return this.editor.contentDocument.getSelection().getRangeAt(0).endContainer;
      }), distinctUntilChanged()).subscribe(node => {
      this.paths.update(node as Element);
    });
    this.editor.onReady.subscribe(() => {
      this.tasks.forEach(fn => fn());
      this.readyState = true;
    });
    this.editor.contentChange.subscribe(result => {
      this.changeEvent.next(result);
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

    if (option.hooks) {
      this.run(() => {
        this.hooksList.push(option.hooks);
        this.editor.use(option.hooks);
      });
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

  updateContentHTML(html: string) {
    this.run(() => {
      this.editor.updateContents(html);
    });
  }

  focus() {
    this.run(() => {
      this.editor.contentDocument.body.focus();
    });
  }

  private run(fn: () => void) {
    if (!this.readyState) {
      this.tasks.push(fn);
      return;
    }
    fn();
  }

  private updateToolbarStatus() {
    const ranges = this.editor.getRanges();
    this.handlers.forEach(handler => {
      const delta = ranges.map(range => {
        return handler.matcher.match(this.editor, range);
      }).reduce((previousValue, currentValue) => {
        return {
          inSingleContainer: previousValue.inSingleContainer && currentValue.inSingleContainer,
          overlap: previousValue.overlap && currentValue.overlap,
          contain: previousValue.contain || currentValue.contain,
          container: currentValue.container,
          config: currentValue.config,
          disable: previousValue.disable || currentValue.disable,
          range: currentValue.range
        };
      });
      handler.updateStatus(delta);
    });
  }

  private addButtonHandler(option: ButtonHandlerOption) {
    const button = new ButtonHandler(option);
    button.onApply.pipe(filter(() => this.canApplyAction)).subscribe(() => {
      this.apply(button);
    });
    this.toolbar.appendChild(button.elementRef);
    this.handlers.push(button);
  }

  private addSelectHandler(option: SelectHandlerOption) {
    const select = new SelectHandler(option);
    select.options.forEach(item => {
      item.onApply.pipe(filter(() => this.canApplyAction)).subscribe(() => {
        this.apply(item);
      });
      this.handlers.push(item);
    });
    this.toolbar.appendChild(select.elementRef);
  }

  private addDropdownHandler(handler: DropdownHandlerOption) {
    const dropdown = new DropdownHandler(handler, this);
    this.toolbar.appendChild(dropdown.elementRef);
    dropdown.onApply.pipe(filter(() => this.canApplyAction)).subscribe(() => {
      this.apply(dropdown);
    });
    this.handlers.push(dropdown);
  }

  private addActionSheetHandler(handler: ActionSheetHandlerOption) {
    const actionSheet = new ActionSheetHandler(handler);
    this.toolbar.appendChild(actionSheet.elementRef);
    actionSheet.options.forEach(item => {
      item.onApply.pipe(filter(() => this.canApplyAction)).subscribe(() => {
        this.apply(item);
      });
      this.handlers.push(item);
    });
  }

  private apply(handler: Handler) {
    const doc = this.editor.contentDocument;
    this.editor.getRanges().forEach(range => {
      this.hooksList.filter(hooks => typeof hooks.onApply === 'function').reduce((previousValue, currentValue) => {
        return previousValue.map(tbRange => {
          const matchDelta = handler.matcher.match(this.editor, tbRange.rawRange);
          const ranges = currentValue.onApply(tbRange.rawRange, matchDelta, {
            window: this.editor.contentWindow,
            document: this.editor.contentDocument
          });
          return Array.isArray(ranges) ? ranges : [ranges];
        }).reduce((p, v) => {
          return p.concat(v);
        }).map(r => new TBRange(r, doc));
      }, [new TBRange(range, doc)]).forEach(tbRange => {
        handler.execCommand.format(tbRange, this.editor, handler.matcher.match(this.editor, tbRange.rawRange));
      });
    });
    if (handler.execCommand.recordHistory) {
      this.editor.recordSnapshot();
    }
    doc.body.focus();
  }

  private static createSplitLine() {
    const splitLine = document.createElement('span');
    splitLine.classList.add('tanbo-editor-split-line');
    return splitLine;
  }
}
