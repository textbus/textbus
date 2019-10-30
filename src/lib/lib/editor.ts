import { Observable, zip } from 'rxjs';
import { filter } from 'rxjs/operators';

import { Viewer } from './viewer/viewer';
import { ButtonConfig, HandlerConfig, HandlerType } from './toolbar/help';
import { ButtonHandler } from './toolbar/handlers/button-handler';
import { Handler } from './toolbar/handlers/help';
import { RootElement } from './vnode/root-element';


export interface EditorOptions {
  historyStackSize?: number;
  handlers?: (HandlerConfig | HandlerConfig[])[];
  content?: string;

  uploader?(type: string): (string | Promise<string> | Observable<string>);

  placeholder?: string;
}

export class Editor {
  readonly elementRef = document.createElement('div');

  private viewer = new Viewer();
  private readonly toolbar = document.createElement('div');
  private readonly container: HTMLElement;
  private readonly handlers: Handler[] = [];
  private isFirst = true;

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

    zip(this.writeContents(options.content || '01<strong>23<span style="font-weight: normal">45</span>67</strong>89'), this.viewer.onReady).subscribe(result => {
      const vDom = new RootElement(result[1], this.handlers);
      vDom.setContents(result[0]);
      // this.viewer.
    });

    this.toolbar.classList.add('tanbo-editor-toolbar');

    this.elementRef.appendChild(this.toolbar);
    this.elementRef.appendChild(this.viewer.elementRef);
    // this.elementRef.appendChild(this.paths.elementRef);

    this.elementRef.classList.add('tanbo-editor-container');
    this.container.appendChild(this.elementRef);
  }

  addHandler(option: HandlerConfig) {
    this.isFirst = false;
    switch (option.type) {
      case HandlerType.Button:
        this.addButtonHandler(option);
        break;
      // case HandlerType.Select:
      //   this.addSelectHandler(option);
      //   break;
      // case HandlerType.Dropdown:
      //   this.addDropdownHandler(option);
      //   break;
      // case HandlerType.ActionSheet:
      //   this.addActionSheetHandler(option);
    }
    // if (option.hooks) {
    //   this.run(() => {
    //     this.editor.use(option.hooks);
    //   });
    // }
  }

  addGroup(handlers: HandlerConfig[]) {
    if (!this.isFirst) {
      this.toolbar.appendChild(Editor.createSplitLine());
    }
    handlers.forEach(handler => {
      this.addHandler(handler);
    });
  }

  private addButtonHandler(option: ButtonConfig) {
    const button = new ButtonHandler(option);
    // button.onApply.pipe(filter(() => this.canApplyAction)).subscribe(() => {
    //   this.editor.apply(button.execCommand, button.matcher, option.hooks);
    // });
    this.toolbar.appendChild(button.elementRef);
    this.handlers.push(button);
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

  private static createSplitLine() {
    const splitLine = document.createElement('span');
    splitLine.classList.add('tanbo-editor-split-line');
    return splitLine;
  }
}
