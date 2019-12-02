import { from, Observable, of, Subject, Subscription, zip } from 'rxjs';
import { auditTime, sampleTime, tap } from 'rxjs/operators';

import {
  ActionSheetConfig,
  ButtonConfig,
  DropdownConfig,
  EventDelegate,
  HandlerConfig,
  HandlerType,
  SelectConfig
} from './toolbar/help';
import { ViewRenderer } from './viewer/view-renderer';
import { ButtonHandler } from './toolbar/handlers/button-handler';
import { Handler } from './toolbar/handlers/help';
import { RootFragment } from './parser/root-fragment';
import { ActionSheetHandler } from './toolbar/handlers/action-sheet-handler';
import { TBSelection } from './selection/selection';
import { SelectHandler } from './toolbar/handlers/select-handler';
import { DropdownHandler } from './toolbar/handlers/dropdown-handler';
import { defaultHandlers } from './default-handlers';
import { Paths } from './paths/paths';
import { Fragment } from './parser/fragment';

export interface Snapshot {
  doc: Fragment;
  selection: TBSelection;
}

export interface EditorOptions {
  historyStackSize?: number;
  handlers?: (HandlerConfig | HandlerConfig[])[];
  content?: string;

  uploader?(type: string): (string | Promise<string> | Observable<string>);

  placeholder?: string;
}

export class Editor implements EventDelegate {
  onChange: Observable<string>;
  readonly elementRef = document.createElement('div');

  get canBack() {
    return this.historySequence.length > 0 && this.historyIndex > 0;
  }

  get canForward() {
    return this.historySequence.length > 0 && this.historyIndex < this.historySequence.length - 1;
  }

  private historySequence: Array<Snapshot> = [];
  private historyIndex = 0;
  private readonly historyStackSize: number;

  private root: RootFragment;
  private readonly viewer = new ViewRenderer();
  private readonly paths = new Paths();
  private readonly toolbar = document.createElement('div');
  private readonly container: HTMLElement;
  private readonly handlers: Handler[] = [...defaultHandlers];

  private changeEvent = new Subject<string>();
  private tasks: Array<() => void> = [];
  private isFirst = true;
  private readyState = false;
  private selection: TBSelection;

  private sub: Subscription;

  constructor(private selector: string | HTMLElement, private options: EditorOptions = {}) {
    this.onChange = this.changeEvent.asObservable();
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
    this.historyStackSize = options.historyStackSize || 50;
    if (Array.isArray(options.handlers)) {
      options.handlers.forEach(handler => {
        if (Array.isArray(handler)) {
          this.addGroup(handler);
        } else {
          this.addHandler(handler);
        }
      });
      this.listenUserAction();
    }

    zip(this.writeContents(options.content || '<p><br><br><br></p>'), this.viewer.onReady).subscribe(result => {
      const vDom = new RootFragment(this.handlers, this);
      this.root = vDom;
      vDom.setContents(result[0]);
      this.viewer.render(vDom);
      this.recordSnapshot();
      this.tasks.forEach(fn => fn());
    });

    this.viewer.onSelectionChange.pipe(auditTime(100)).subscribe(selection => {
      this.readyState = true;
      this.selection = selection;
      const event = document.createEvent('Event');
      event.initEvent('click', true, true);
      this.elementRef.dispatchEvent(event);
      this.paths.update(selection.focusNode);
      this.updateHandlerState(selection);
    });

    this.listenUserWriteEvent();

    this.toolbar.classList.add('tanbo-editor-toolbar');

    this.elementRef.appendChild(this.toolbar);
    this.elementRef.appendChild(this.viewer.elementRef);
    this.elementRef.appendChild(this.paths.elementRef);

    this.elementRef.classList.add('tanbo-editor-container');
    this.container.appendChild(this.elementRef);
  }

  updateHandlerState(selection: TBSelection) {
    this.handlers.filter(h => typeof h.updateStatus === 'function').forEach(handler => {
      const s = handler.matcher.queryState(selection, handler);
      handler.updateStatus(s);
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

  getPreviousSnapshot() {
    if (this.canBack) {
      this.historyIndex--;
      this.historyIndex = Math.max(0, this.historyIndex);
      return this.historySequence[this.historyIndex];
    }
    return null;
  }

  getNextSnapshot() {
    if (this.canForward) {
      this.historyIndex++;
      return this.historySequence[this.historyIndex];
    }
    return null;
  }

  private addHandler(option: HandlerConfig) {
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
        this.viewer.use(option.hooks);
      });
    }
  }

  private addGroup(handlers: HandlerConfig[]) {
    if (!this.isFirst) {
      this.toolbar.appendChild(Editor.createSplitLine());
    }
    handlers.forEach(handler => {
      this.addHandler(handler);
    });
  }

  private recordSnapshot() {
    if (this.historySequence.length !== this.historyIndex) {
      this.historySequence.length = this.historyIndex + 1;
    }
    this.historySequence.push({
      doc: this.root.clone(),
      selection: this.viewer.cloneSelection()
    });
    if (this.historySequence.length > this.historyStackSize) {
      this.historySequence.shift();
    }
    this.historyIndex = this.historySequence.length - 1;
    this.dispatchContentChangeEvent();
  }

  private dispatchContentChangeEvent() {
    this.changeEvent.next(this.viewer.contentDocument.documentElement.outerHTML);
  }

  private addDropdownHandler(option: DropdownConfig) {
    const dropdown = new DropdownHandler(option, this);
    this.toolbar.appendChild(dropdown.elementRef);
    this.handlers.push(dropdown);
  }

  private addSelectHandler(option: SelectConfig) {
    const select = new SelectHandler(option);
    this.handlers.push(select);
    this.toolbar.appendChild(select.elementRef);
  }

  private addButtonHandler(option: ButtonConfig) {
    const button = new ButtonHandler(option);
    this.toolbar.appendChild(button.elementRef);
    this.handlers.push(button);
  }

  private addActionSheetHandler(option: ActionSheetConfig) {
    const actionSheet = new ActionSheetHandler(option);
    this.toolbar.appendChild(actionSheet.elementRef);
    actionSheet.options.forEach(item => {
      this.handlers.push(item);
    });
  }

  private listenUserAction() {
    this.handlers.forEach(item => {
      if (item.onApply instanceof Observable) {
        item.onApply.subscribe(() => {
          this.viewer.apply(item);
          if (item.execCommand.recordHistory) {
            this.recordSnapshot();
            this.listenUserWriteEvent();
          }
        });
      }
    });
  }

  private writeContents(html: string) {
    return new Promise<HTMLElement>(resolve => {
      const temporaryIframe = document.createElement('iframe');
      temporaryIframe.onload = () => {
        const body = temporaryIframe.contentDocument.body;
        document.body.removeChild(temporaryIframe);
        resolve(body);
      };
      temporaryIframe.style.cssText =
        'position: absolute;' +
        'left: -9999px;' +
        'top: -9999px;' +
        'width:0;' +
        'height:0;' +
        'opacity:0';
      temporaryIframe.src = `javascript:void((function () {
                      document.open();
                      document.domain = '${document.domain}';
                      document.write('${html}');
                      document.close();
                    })())`;

      document.body.appendChild(temporaryIframe);
    });
  }

  private run(fn: () => void) {
    if (!this.readyState) {
      this.tasks.push(fn);
      return;
    }
    fn();
  }

  private listenUserWriteEvent() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
    this.sub = this.viewer.onUserWrite.pipe(tap(() => {
      this.dispatchContentChangeEvent();
    })).pipe(sampleTime(5000)).subscribe(() => {
      this.recordSnapshot();
      this.updateHandlerState(this.viewer.cloneSelection());
    });
  }

  private static createSplitLine() {
    const splitLine = document.createElement('span');
    splitLine.classList.add('tanbo-editor-split-line');
    return splitLine;
  }
}
