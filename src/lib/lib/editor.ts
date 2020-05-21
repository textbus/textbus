import { auditTime, filter } from 'rxjs/operators';
import { from, Observable, of, zip } from 'rxjs';

import { Parser } from './core/parser';
import { TemplateTranslator } from './core/template';
import { Formatter } from './core/formatter';
import { Viewer } from './viewer/viewer';
import { Renderer } from './core/renderer';
import { Toolbar } from './toolbar/toolbar';
import { EventDelegate, HandlerConfig } from './toolbar/help';
import { RangePath, TBSelection } from './viewer/selection';
import { Fragment } from './core/fragment';

export interface Snapshot {
  contents: Fragment;
  paths: RangePath[];
}

export interface EditorOptions {
  theme?: string;
  templateTranslators?: TemplateTranslator[];
  formatters?: Formatter[];
  toolbar?: (HandlerConfig | HandlerConfig[])[];

  uploader?(type: string): (string | Promise<string> | Observable<string>);

  contents?: string;
}

export class Editor implements EventDelegate {
  get canBack() {
    return this.historySequence.length > 0 && this.historyIndex > 0;
  }

  get canForward() {
    return this.historySequence.length > 0 && this.historyIndex < this.historySequence.length - 1;
  }

  readonly elementRef = document.createElement('div');

  private readonly frameContainer = document.createElement('div');
  private readonly container: HTMLElement;

  private parser: Parser;
  private readonly toolbar: Toolbar;
  private renderer = new Renderer();
  private viewer = new Viewer(this.renderer, this);

  private readyState = false;
  private tasks: Array<() => void> = [];

  private historySequence: Array<Snapshot> = [];
  private historyIndex = 0;
  private readonly historyStackSize: number;

  private selection: TBSelection;

  private defaultHTML = '<p><br></p>';

  constructor(private selector: string | HTMLElement, private options: EditorOptions) {
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
    this.parser = new Parser(options);

    this.frameContainer.classList.add('tbus-frame-container');
    this.toolbar = new Toolbar(this, options.toolbar);

    this.toolbar.onAction
      .pipe(filter(() => !!this.selection))
      .subscribe(config => {
        this.viewer.apply(config);
        if (config.execCommand.recordHistory) {
          // this.recordSnapshot();
          // this.listenUserWriteEvent();
        }
      });

    this.viewer.onSelectionChange.pipe(auditTime(100)).subscribe(selection => {
      this.selection = selection;
      const event = document.createEvent('Event');
      event.initEvent('click', true, true);
      this.elementRef.dispatchEvent(event);
      this.toolbar.updateHandlerState(selection, this.renderer);
    });

    this.elementRef.appendChild(this.toolbar.elementRef);
    this.elementRef.appendChild(this.frameContainer);
    // this.frameContainer.appendChild(this.loading.elementRef);
    this.frameContainer.appendChild(this.viewer.elementRef);
    // this.elementRef.appendChild(this.paths.elementRef);

    this.elementRef.classList.add('tbus-container');
    if (options.theme) {
      this.elementRef.classList.add('tbus-theme-' + options.theme);
    }
    this.container.appendChild(this.elementRef);

    zip(from(this.writeContents(options.contents || this.defaultHTML)), this.viewer.onReady).subscribe(result => {
      this.readyState = true;
      const rootFragment = this.parser.parse(result[0]);
      this.viewer.render(rootFragment);
      // this.recordSnapshot();
      this.tasks.forEach(fn => fn());
    });
  }

  setContents(html: string) {
    this.run(() => {
      this.writeContents(html).then(el => {
        const rootFragment = this.parser.parse(el);
        this.viewer.render(rootFragment);
      });
    })
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

  // private recordSnapshot() {
  //   if (this.historySequence.length !== this.historyIndex) {
  //     this.historySequence.length = this.historyIndex + 1;
  //   }
  //   this.historySequence.push({
  //     contents: this.root.clone(),
  //     paths: this.viewer.selection.getRangePaths()
  //   });
  //   if (this.historySequence.length > this.historyStackSize) {
  //     this.historySequence.shift();
  //   }
  //   this.historyIndex = this.historySequence.length - 1;
  //   this.dispatchContentChangeEvent();
  // }

  private run(fn: () => void) {
    if (!this.readyState) {
      this.tasks.push(fn);
      return;
    }
    fn();
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
                      document.write('${html.replace(/[']/g, '\\\'')}');
                      document.close();
                    })())`;

      document.body.appendChild(temporaryIframe);
    });
  }
}
