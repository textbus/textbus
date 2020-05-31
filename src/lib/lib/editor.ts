import { auditTime, filter, sampleTime, switchMap, tap } from 'rxjs/operators';
import { from, Observable, of, Subject, Subscription, zip } from 'rxjs';

import {
  Parser,
  TemplateTranslator,
  InlineFormatter,
  Renderer,
  RangePath,
  TBSelection,
  Lifecycle,
  Fragment
} from './core/_api';
import { Viewer, KeymapAction } from './viewer/_api';
import { Toolbar, EventDelegate, ContextMenu, ToolFactory } from './toolbar/_api';

export interface Snapshot {
  contents: Fragment;
  paths: RangePath[];
}

export interface EditorOptions {
  theme?: string;
  historyStackSize?: number;
  templateTranslators?: TemplateTranslator[];
  formatters?: InlineFormatter[];
  toolbar?: (ToolFactory | ToolFactory[])[];
  hooks?: Lifecycle[];
  styleSheets?: string[];

  uploader?(type: string): (string | Promise<string> | Observable<string>);

  contents?: string;
}

export class Editor implements EventDelegate {
  readonly onChange: Observable<void>;

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
  private contextMenu = new ContextMenu(this.renderer);

  private readyState = false;
  private tasks: Array<() => void> = [];

  private historySequence: Array<Snapshot> = [];
  private historyIndex = 0;
  private readonly historyStackSize: number;

  private selection: TBSelection;

  private defaultHTML = '<p><br></p>';
  private rootFragment: Fragment;
  private sub: Subscription;
  private changeEvent = new Subject<void>();


  constructor(public selector: string | HTMLElement, public options: EditorOptions) {
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
    this.historyStackSize = options.historyStackSize || 50;
    this.onChange = this.changeEvent.asObservable();

    this.parser = new Parser(options);

    this.frameContainer.classList.add('tbus-frame-container');

    this.toolbar = new Toolbar(this, this.contextMenu, options.toolbar);

    this.toolbar.onAction
      .pipe(filter(() => !!this.selection))
      .subscribe(config => {
        this.viewer.apply(config);
        if (config.execCommand.recordHistory) {
          this.recordSnapshot();
          this.listenUserWriteEvent();
        }
      });
    const unsub = zip(from(this.writeContents(options.contents || this.defaultHTML)), this.viewer.onReady).pipe(switchMap(result => {
      this.readyState = true;
      const rootFragment = this.parser.parse(result[0]);
      this.rootFragment = rootFragment;
      this.viewer.render(rootFragment);
      this.tasks.forEach(fn => fn());
      return this.viewer.onCanEditable;
    })).subscribe(selection => {
      this.selection = selection;
      this.recordSnapshot();
      unsub.unsubscribe();
    });
    this.viewer.onSelectionChange.pipe(tap(s => this.selection = s), auditTime(100)).subscribe(selection => {
      const event = document.createEvent('Event');
      event.initEvent('click', true, true);
      this.elementRef.dispatchEvent(event);
      this.toolbar.updateHandlerState(selection, this.renderer);
    });

    this.elementRef.appendChild(this.toolbar.elementRef);
    this.elementRef.appendChild(this.frameContainer);
    this.frameContainer.appendChild(this.viewer.elementRef);

    this.elementRef.classList.add('tbus-container');
    if (options.theme) {
      this.elementRef.classList.add('tbus-theme-' + options.theme);
    }
    this.container.appendChild(this.elementRef);

    this.listenUserWriteEvent();

  }

  setContents(html: string) {
    this.run(() => {
      this.writeContents(html).then(el => {
        const rootFragment = this.parser.parse(el);
        this.rootFragment = rootFragment;
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
      return Editor.cloneHistoryData(this.historySequence[this.historyIndex]);
    }
    return null;
  }

  getNextSnapshot() {
    if (this.canForward) {
      this.historyIndex++;
      return Editor.cloneHistoryData(this.historySequence[this.historyIndex]);
    }
    return null;
  }

  getContents() {
    const contents = (this.options.hooks || []).reduce((previousValue, currentValue) => {
      if (typeof currentValue.onOutput === 'function') {
        return currentValue.onOutput(previousValue);
      }
      return previousValue;
    }, this.renderer.renderToString(this.rootFragment));
    return {
      styleSheets: this.options.styleSheets,
      contents
    };
  }

  registerKeymap(action: KeymapAction) {
    this.run(() => {
      this.viewer.registerKeymap(action);
    });
  }

  private recordSnapshot() {
    if (this.historySequence.length !== this.historyIndex) {
      this.historySequence.length = this.historyIndex + 1;
    }
    this.historySequence.push({
      contents: this.rootFragment.clone(),
      paths: this.selection.getRangePaths()
    });
    if (this.historySequence.length > this.historyStackSize) {
      this.historySequence.shift();
    }
    this.historyIndex = this.historySequence.length - 1;
    this.dispatchContentChangeEvent();
  }

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

  private dispatchContentChangeEvent() {
    this.changeEvent.next();
  }

  private listenUserWriteEvent() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
    this.sub = this.viewer.onUserWrite.pipe(tap(() => {
      this.dispatchContentChangeEvent();
    })).pipe(sampleTime(5000)).subscribe(() => {
      this.recordSnapshot();
      this.toolbar.updateHandlerState(this.selection, this.renderer);
    });
  }

  private static cloneHistoryData(snapshot: Snapshot): Snapshot {
    return {
      contents: snapshot.contents.clone(),
      paths: snapshot.paths.map(i => i)
    }
  }
}
