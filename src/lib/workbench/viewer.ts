import { Observable, Subject } from 'rxjs';
import { forwardRef, getAnnotations, Inject, Injectable, Injector, Provider, ReflectiveInjector } from '@tanbo/di';
import { debounceTime } from 'rxjs/operators';

import { EDITABLE_DOCUMENT, EDITOR_OPTIONS, EditorOptions } from '../editor';
import { Component, Parser, Renderer, TBSelection } from '../core/_api';
import { iframeHTML } from './iframe-html';
import { HistoryManager } from '../history-manager';
import { Input } from './input';
import { RootComponent } from '../root-component';
import { Toolbar } from '../toolbar/toolbar';

@Injectable()
export class Viewer {
  onReady: Observable<void>;

  get contentWindow() {
    return this.elementRef.contentWindow;
  }

  get contentDocument() {
    return this.elementRef.contentDocument;
  };

  elementRef = document.createElement('iframe');

  set sourceCodeMode(b: boolean) {
    this._sourceCodeMode = b;
    if (this.contentDocument) {
      if (b) {
        this.contentDocument.head.append(this.sourceCodeModeStyleSheet)
      } else {
        this.sourceCodeModeStyleSheet.parentNode?.removeChild(this.sourceCodeModeStyleSheet);
      }
    }
  }

  private _sourceCodeMode = false;
  private sourceCodeModeStyleSheet = document.createElement('style');
  private readyEvent = new Subject<void>();
  private id: number = null;
  private minHeight = 400;

  constructor(@Inject(forwardRef(() => EDITOR_OPTIONS)) private options: EditorOptions<any>,
              private injector: Injector) {
    this.onReady = this.readyEvent.asObservable();
    this.sourceCodeModeStyleSheet.innerHTML = `body{padding:0}body>pre{border-radius:0;border:none;margin:0;height:100%;background:none}`;

    this.elementRef.setAttribute('scrolling', 'no');
    const styleEl = document.createElement('style');
    styleEl.innerHTML = [...(options.styleSheets || []), ...(options.editingStyleSheets || [])].join('');

    const html = iframeHTML.replace(/(?=<\/head>)/, styleEl.outerHTML);
    this.elementRef.src = `javascript:void(
      (function () {
        document.open();
        document.domain='${document.domain}';
        document.write('${html}');
        document.close();
        window.parent.postMessage('complete','${location.origin}');
      })()
      )`;
    const onMessage = (ev: MessageEvent) => {
      if (ev.data === 'complete') {
        window.removeEventListener('message', onMessage);
        if (this.contentDocument) {
          this.setup();
          this.listen();
          this.readyEvent.next();
        }
      }
    }
    window.addEventListener('message', onMessage);
    this.elementRef.classList.add('textbus-frame');
  }

  setMinHeight(height: number) {
    this.minHeight = height;
  }

  destroy() {
    cancelAnimationFrame(this.id);
  }

  setup() {
    const componentAnnotations = this.options.components.map(c => {
      return getAnnotations(c).getClassMetadata(Component).params[0] as Component
    })
    const renderer = new Renderer();
    const selection = new TBSelection(this.contentDocument, renderer);
    const parser = new Parser(componentAnnotations.map(c => c.loader), this.options.formatters);
    const viewProviders: Provider[] = [{
      provide: EDITABLE_DOCUMENT,
      useValue: this.contentDocument
    }, {
      provide: Parser,
      useValue: parser
    }, {
      provide: HistoryManager,
      useValue: new HistoryManager(this.options.historyStackSize)
    }, {
      provide: TBSelection,
      useValue: selection
    }, {
      provide: Renderer,
      useValue: renderer
    }];
    const viewInjector = new ReflectiveInjector(this.injector, [
      Input,
      RootComponent,
      ...viewProviders
    ]);

    const rootComponent = viewInjector.get(RootComponent);
    const toolbar = viewInjector.get(Toolbar);
    toolbar.setup(viewInjector);


    rootComponent.onChange.pipe(debounceTime(1)).subscribe(() => {
      (this.options.plugins || []).forEach(plugin => {
        plugin.onRenderingBefore?.();
      })
      renderer.render(rootComponent.slot, this.contentDocument.body);
      selection.restore();
      (this.options.plugins || []).forEach(plugin => {
        plugin.onViewUpdated?.();
      })
    })

    const dom = Viewer.parserHTML(this.options.contents || '<p><br></p>');
    rootComponent.slot.from(parser.parse(dom));
    const rootAnnotation = getAnnotations(RootComponent).getClassMetadata(Component).params[0] as Component;
    rootAnnotation.interceptor.setup(viewInjector);
    componentAnnotations.forEach(c => {
      c.interceptor?.setup(viewInjector);
    });

    selection.onChange.subscribe(() => {
      (this.options.plugins || []).forEach(plugin => {
        plugin.onSelectionChange?.();
      })
    });

    (this.options.plugins || []).forEach(plugin => {
      plugin.setup(viewInjector);
    })
  }


  private listen() {
    const fn = () => {
      const childBody = this.contentDocument.body;
      const lastChild = childBody.lastChild;
      let height = 0;
      if (lastChild) {
        if (lastChild.nodeType === Node.ELEMENT_NODE) {
          height = (lastChild as HTMLElement).getBoundingClientRect().bottom;
        } else {
          const div = this.contentDocument.createElement('div');
          childBody.appendChild(div);
          height = div.getBoundingClientRect().bottom;
          childBody.removeChild(div);
        }
      }
      this.elementRef.style.height = Math.max(height + 30, this.minHeight) + 'px';
      this.id = requestAnimationFrame(fn);
    }
    this.id = requestAnimationFrame(fn);
  }

  private static parserHTML(html: string) {
    return new DOMParser().parseFromString(html, 'text/html').body;
  }
}
