import { Parser } from './core/parser';
import { TemplateTranslator } from './core/template';
import { Formatter } from './core/formatter';
import { Viewer } from './viewer/viewer';
import { Renderer } from './core/renderer';
import { Toolbar } from './toolbar/toolbar';
import { HandlerConfig } from './toolbar/help';
import { filter } from 'rxjs/operators';

export interface EditorOptions {
  theme?: string;
  templates?: TemplateTranslator[];
  formats?: Formatter[];
  toolbar?: (HandlerConfig | HandlerConfig[])[];
}

export class Editor {
  readonly elementRef = document.createElement('div');
  private readonly frameContainer = document.createElement('div');
  private readonly container: HTMLElement;

  private parser: Parser;
  private readonly toolbar: Toolbar;
  private viewer = new Viewer(new Renderer());

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
        this.viewer.apply(config, config.matcher);
        if (config.execCommand.recordHistory) {
          // this.recordSnapshot();
          // this.listenUserWriteEvent();
        }
      });

    // this.viewer.onSelectionChange.pipe(auditTime(100)).subscribe(selection => {
    //   this.selection = selection;
    //   const event = document.createEvent('Event');
    //   event.initEvent('click', true, true);
    //   this.elementRef.dispatchEvent(event);
    //   this.toolbar.updateHandlerState(selection);
    // });

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
