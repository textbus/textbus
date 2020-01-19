import { from, Observable, of, Subject, Subscription, zip } from 'rxjs';
import { auditTime, distinctUntilChanged, filter, sampleTime, tap } from 'rxjs/operators';

import { EventDelegate, HandlerConfig } from './toolbar/help';
import { Viewer } from './viewer/viewer';
import { Handler } from './toolbar/handlers/help';
import { RootFragment } from './parser/root-fragment';
import { RangePath, TBSelection } from './viewer/selection';
import { Paths } from './paths/paths';
import { Fragment } from './parser/fragment';
import { Parser } from './parser/parser';
import { Differ } from './renderer/differ';
import { DomRenderer } from './renderer/dom-renderer';
import { Renderer } from './renderer/renderer';
import { Toolbar } from './toolbar/toolbar';
import { Hook } from './viewer/help';
import { Keymap } from './viewer/events';

export interface Snapshot {
  doc: Fragment;
  paths: RangePath[];
}

export interface EditorSettings {
  renderer?: Renderer;
}

export interface EditorOptions {
  theme?: string;
  historyStackSize?: number;
  handlers?: (HandlerConfig | HandlerConfig[])[];
  content?: string;
  usePaperModel?: boolean;
  settings?: EditorSettings;

  uploader?(type: string): (string | Promise<string> | Observable<string>);

}

export class Editor implements EventDelegate {
  readonly onChange: Observable<string>;
  readonly parser: Parser;
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
  private readonly viewer: Viewer;
  private readonly renderer: Renderer;
  private readonly paths = new Paths();
  private readonly toolbar: Toolbar;
  private readonly frameContainer = document.createElement('div');
  private readonly container: HTMLElement;

  private changeEvent = new Subject<string>();
  private tasks: Array<() => void> = [];
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
    this.toolbar = new Toolbar(this, options.handlers);
    this.toolbar.onAction.pipe(filter(() => this.readyState)).subscribe((handler: Handler) => {
      this.viewer.apply(handler);
      if (handler.execCommand.recordHistory) {
        this.recordSnapshot();
        this.listenUserWriteEvent();
      }
      // this.updateHandlerState(this.selection);
    });
    this.parser = new Parser(this.toolbar.handlers);
    this.renderer = options?.settings?.renderer || new DomRenderer();
    this.viewer = new Viewer(this, new Differ(this.parser, this.renderer));
    zip(this.writeContents(options.content || '<p><br></p>'), this.viewer.onReady).subscribe(result => {
      const vDom = new RootFragment(this.parser);
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
      this.toolbar.updateHandlerState(selection);
    });

    this.viewer.onSelectionChange.pipe(distinctUntilChanged()).subscribe(() => {
      this.paths.update(this.viewer.nativeSelection.focusNode);
    });

    this.listenUserWriteEvent();
    this.frameContainer.classList.add('tbus-frame-container');

    this.elementRef.appendChild(this.toolbar.elementRef);
    this.elementRef.appendChild(this.frameContainer);
    this.frameContainer.appendChild(this.viewer.elementRef);
    this.elementRef.appendChild(this.paths.elementRef);

    this.elementRef.classList.add('tbus-container');
    if (options.theme) {
      this.elementRef.classList.add('tbus-theme-' + options.theme);
    }
    this.container.appendChild(this.elementRef);

    if (options.usePaperModel) {
      this.frameContainer.style.padding = '20px 0';
      this.viewer.elementRef.style.cssText = 'width: 600px;';
    }
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

  private recordSnapshot() {
    if (this.historySequence.length !== this.historyIndex) {
      this.historySequence.length = this.historyIndex + 1;
    }
    this.historySequence.push({
      doc: this.root.clone(),
      paths: this.viewer.selection.getRangePaths()
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
                      document.write('${html.replace(/[']/g, '\\\'')}');
                      document.close();
                    })())`;

      document.body.appendChild(temporaryIframe);
    });
  }

  registerHook(hook: Hook) {
    this.run(() => {
      this.viewer.use(hook);
    });
  }

  registerKeymap(keymap: Keymap) {
    this.run(() => {
      this.viewer.registerKeymap(keymap);
    })
  }

  run(fn: () => void) {
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
      this.toolbar.updateHandlerState(this.viewer.cloneSelection());
    });
  }
}
