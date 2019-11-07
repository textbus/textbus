import { Observable, zip } from 'rxjs';

import { ViewRenderer } from './viewer/view-renderer';
import {
  ActionSheetConfig,
  ButtonConfig,
  DropdownConfig, EventDelegate,
  HandlerConfig,
  HandlerType,
  SelectConfig
} from './toolbar/help';
import { ButtonHandler } from './toolbar/handlers/button-handler';
import { Handler } from './toolbar/handlers/help';
import { Parser } from './parser/parser';
import { ActionSheetHandler } from './toolbar/handlers/action-sheet-handler';
import { TBSelection } from './selection/selection';
import { SelectHandler } from './toolbar/handlers/select-handler';
import { DropdownHandler } from './toolbar/handlers/dropdown-handler';


export interface EditorOptions {
  historyStackSize?: number;
  handlers?: (HandlerConfig | HandlerConfig[])[];
  content?: string;

  uploader?(type: string): (string | Promise<string> | Observable<string>);

  placeholder?: string;
}

export class Editor implements EventDelegate {
  readonly elementRef = document.createElement('div');

  private viewer = new ViewRenderer();
  private readonly toolbar = document.createElement('div');
  private readonly container: HTMLElement;
  private readonly handlers: Handler[] = [];

  private tasks: Array<() => void> = [];
  private isFirst = true;
  private readyState = false;

  constructor(selector: string | HTMLElement, options: EditorOptions = {}) {
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

    zip(this.writeContents(options.content || '<p><br></p>'), this.viewer.onReady).subscribe(result => {
      const vDom = new Parser(this.handlers);
      vDom.setContents(result[0]);
      this.viewer.render(vDom);
      this.tasks.forEach(fn => fn());
      this.readyState = true;
    });

    this.viewer.onSelectionChange.subscribe(selection => {
      this.updateHandlerState(selection);
    });

    this.toolbar.classList.add('tanbo-editor-toolbar');

    this.elementRef.appendChild(this.toolbar);
    this.elementRef.appendChild(this.viewer.elementRef);
    // this.elementRef.appendChild(this.paths.elementRef);

    this.elementRef.classList.add('tanbo-editor-container');
    this.container.appendChild(this.elementRef);
  }

  updateHandlerState(selection: TBSelection) {
    this.handlers.forEach(handler => {
      const overlap = handler.matcher.queryState(selection, handler).overlap;
      handler.updateStatus(overlap);
    });
  }

  addHandler(option: HandlerConfig) {
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

  addGroup(handlers: HandlerConfig[]) {
    if (!this.isFirst) {
      this.toolbar.appendChild(Editor.createSplitLine());
    }
    handlers.forEach(handler => {
      this.addHandler(handler);
    });
  }

  dispatchEvent(type: string): Observable<string> {
    return new Observable();
  }

  private addDropdownHandler(option: DropdownConfig) {
    const dropdown = new DropdownHandler(option, this);
    this.toolbar.appendChild(dropdown.elementRef);
    dropdown.onApply.subscribe(() => {
      this.viewer.apply(dropdown);
    });
    this.handlers.push(dropdown);
  }

  private addSelectHandler(option: SelectConfig) {
    const select = new SelectHandler(option);
    select.options.forEach(item => {
      item.onApply.subscribe(() => {
        this.viewer.apply(item);
      });
      this.handlers.push(item);
    });
    this.toolbar.appendChild(select.elementRef);
  }

  private addButtonHandler(option: ButtonConfig) {
    const button = new ButtonHandler(option);
    button.onApply.subscribe(() => {
      this.viewer.apply(button);
    });
    this.toolbar.appendChild(button.elementRef);
    this.handlers.push(button);
  }

  private addActionSheetHandler(option: ActionSheetConfig) {
    const actionSheet = new ActionSheetHandler(option);
    this.toolbar.appendChild(actionSheet.elementRef);
    actionSheet.options.forEach(item => {
      item.onApply.subscribe(() => {
        this.viewer.apply(item);
      });
      this.handlers.push(item);
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

  private static createSplitLine() {
    const splitLine = document.createElement('span');
    splitLine.classList.add('tanbo-editor-split-line');
    return splitLine;
  }
}
