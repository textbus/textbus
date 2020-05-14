import { Parser } from './core/parser';
import { TemplateTranslator } from './core/template';
import { Formatter } from './core/formatter';
import { Viewer } from './viewer/viewer';
import { Renderer } from './core/renderer';
import { Toolbar } from './toolbar/toolbar';
import { EventDelegate, HandlerConfig } from './toolbar/help';
import { auditTime, filter } from 'rxjs/operators';
import { from, Observable, of } from 'rxjs';

export interface EditorOptions {
  theme?: string;
  templates?: TemplateTranslator[];
  formats?: Formatter[];
  toolbar?: (HandlerConfig | HandlerConfig[])[];
  uploader?(type: string): (string | Promise<string> | Observable<string>);
}

export class Editor implements EventDelegate {
  readonly elementRef = document.createElement('div');
  private readonly frameContainer = document.createElement('div');
  private readonly container: HTMLElement;

  private parser: Parser;
  private readonly toolbar: Toolbar;
  private renderer = new Renderer();
  private viewer = new Viewer(this.renderer);

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
      // .pipe(filter(() => !!this.selection))
      .subscribe(config => {
        this.viewer.apply(config);
        if (config.execCommand.recordHistory) {
          // this.recordSnapshot();
          // this.listenUserWriteEvent();
        }
      });

    this.viewer.onSelectionChange.pipe(auditTime(100)).subscribe(selection => {
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
  }

  setContents(html: string) {
    this.writeContents(html).then(el => {
      const rootFragment = this.parser.parse(el);
      this.viewer.render(rootFragment);
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
