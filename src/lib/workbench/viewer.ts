import { fromEvent, Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import {
  forwardRef,
  getAnnotations,
  Inject,
  Injectable,
  Injector,
  Provider,
  ReflectiveInjector,
  Type
} from '@tanbo/di';
import pretty from 'pretty';

import { EDITABLE_DOCUMENT, EDITOR_OPTIONS, EditorOptions } from '../editor';
import { Component, Fragment, OutputRenderer, Parser, Renderer, TBSelection } from '../core/_api';
import { iframeHTML } from './iframe-html';
import { HistoryManager } from '../history-manager';
import { Input } from './input';
import { RootComponent } from '../root-component';
import { Toolbar } from '../toolbar/toolbar';
import { ComponentStage } from './component-stage';
import { EditorController } from '../editor-controller';
import { BlockComponent, BrComponent, PreComponent } from '../components/_api';

declare const ResizeObserver: any;

@Injectable()
export class Viewer {
  onReady: Observable<Injector>;
  onViewUpdated: Observable<void>;
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

  private get contentDocument() {
    return this.elementRef.contentDocument;
  }

  private _sourceCodeMode = false;
  private sourceCodeModeStyleSheet = document.createElement('style');


  private sourceCodeComponent = new PreComponent('HTML', '');
  private outputRenderer = new OutputRenderer();
  private readyEvent = new Subject<Injector>();
  private viewUpdateEvent = new Subject<void>();
  private id: number = null;
  private minHeight = 400;
  private rootComponent: RootComponent;
  private parser: Parser;
  private docStyles: string[];
  private subs: Subscription[] = [];
  private resizeObserver: any;
  private viewInjector: Injector;
  private componentAnnotations: Component[];

  constructor(@Inject(forwardRef(() => EDITOR_OPTIONS)) private options: EditorOptions<any>,
              private componentStage: ComponentStage,
              private editorController: EditorController,
              private injector: Injector) {
    this.onReady = this.readyEvent.asObservable();
    this.onViewUpdated = this.viewUpdateEvent.asObservable();
    this.sourceCodeModeStyleSheet.innerHTML = `body{padding:0}body>pre{border-radius:0;border:none;margin:0;height:100%;background:none}`;

    const componentAnnotations = this.options.components.map(c => {
      return getAnnotations(c).getClassMetadata(Component).params[0] as Component
    })

    this.componentAnnotations = componentAnnotations;

    const componentStyles = componentAnnotations.map(c => {
      return [c.styles?.join('') || '', c.editModeStyles?.join('') || ''].join('')
    }).join('')

    this.elementRef.setAttribute('scrolling', 'no');
    this.docStyles = [componentStyles, ...(options.styleSheets || [])];
    this.elementRef.src = `javascript:void(
      (function () {
        document.open();
        document.domain='${document.domain}';
        document.write('${iframeHTML}');
        document.close();
        window.parent.postMessage('complete','${location.origin}');
      })()
      )`;
    const onMessage = (ev: MessageEvent) => {
      if (ev.data === 'complete') {
        window.removeEventListener('message', onMessage);
        if (this.contentDocument) {
          const styleEl = this.contentDocument.createElement('style');
          styleEl.innerHTML = [...this.docStyles, ...(options.editingStyleSheets || [])].join('');
          this.contentDocument.head.append(styleEl);
          this.setup();
          this.listen();
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
    this.resizeObserver?.disconnect();
    this.subs.forEach(s => s.unsubscribe());
    [Input, HistoryManager].forEach(c => {
      this.viewInjector.get(c as Type<{ destroy(): void }>).destroy();
    });
    (this.options.plugins || []).forEach(p => p.onDestroy?.());
    this.componentAnnotations.forEach(c => {
      c.interceptor?.onDestroy?.();
    })
  }

  setup() {
    const renderer = new Renderer();
    const selection = new TBSelection(
      this.contentDocument,
      fromEvent(this.contentDocument, 'selectionchange'),
      renderer,
      (this.options.plugins || []));
    const parser = this.parser = new Parser(this.componentAnnotations.map(c => c.loader), this.options.formatters);

    const viewProviders: Provider[] = [{
      provide: EDITABLE_DOCUMENT,
      useValue: this.contentDocument
    }, {
      provide: Parser,
      useValue: parser
    }, {
      provide: TBSelection,
      useValue: selection
    }, {
      provide: Renderer,
      useValue: renderer
    }, {
      provide: Injector,
      useFactory() {
        return viewInjector;
      }
    }];
    const viewInjector = new ReflectiveInjector(this.injector, [
      Input,
      HistoryManager,
      RootComponent,
      ...viewProviders
    ]);

    this.viewInjector = viewInjector;

    const rootComponent = this.rootComponent = viewInjector.get(RootComponent);
    const toolbar = viewInjector.get(Toolbar);

    toolbar.setup(viewInjector);
    this.componentStage.setup(viewInjector);


    this.subs.push(
      rootComponent.onChange.pipe(debounceTime(1)).subscribe(() => {
        (this.options.plugins || []).forEach(plugin => {
          plugin.onRenderingBefore?.();
        })
        if (this.editorController.sourceCodeMode) {
          Viewer.guardContentIsPre(rootComponent.slot, this.sourceCodeComponent);
        } else {
          const isEmpty = rootComponent.slot.contentLength === 0;
          Viewer.guardLastIsParagraph(rootComponent.slot);
          if (isEmpty && selection.firstRange) {
            const position = selection.firstRange.findFirstPosition(rootComponent.slot);
            selection.firstRange.setStart(position.fragment, position.index);
            selection.firstRange.setEnd(position.fragment, position.index);
          }
        }
        renderer.render(rootComponent.slot, this.contentDocument.body);
        selection.restore();
        (this.options.plugins || []).forEach(plugin => {
          plugin.onViewUpdated?.();
        })
        this.viewUpdateEvent.next();
      }),

      this.editorController.onStateChange.pipe(map(b => b.sourceCodeMode), distinctUntilChanged()).subscribe(b => {
        selection.removeAllRanges();
        this.sourceCodeMode = b;
        if (b) {
          const html = this.options.outputTranslator.transform(this.outputRenderer.render(this.rootComponent.slot));
          this.rootComponent.slot.clean();
          this.sourceCodeComponent.setSourceCode(pretty(html));
          this.rootComponent.slot.append(this.sourceCodeComponent);
        } else {
          const html = this.sourceCodeComponent.getSourceCode();
          const dom = Viewer.parserHTML(html)
          this.rootComponent.slot.from(this.parser.parse(dom));
        }
      })
    )

    const dom = Viewer.parserHTML(this.options.contents || '<p><br></p>');
    rootComponent.slot.from(parser.parse(dom));
    const rootAnnotation = getAnnotations(RootComponent).getClassMetadata(Component).params[0] as Component;
    rootAnnotation.interceptor.setup(viewInjector);
    this.componentAnnotations.forEach(c => {
      c.interceptor?.setup(viewInjector);
    });

    (this.options.plugins || []).forEach(plugin => {
      plugin.setup(viewInjector);
    })

    viewInjector.get(HistoryManager).startListen();

    this.readyEvent.next(viewInjector);
    this.readyEvent.complete();
  }

  updateContent(html: string) {
    this.rootComponent.slot.from(this.parser.parse(Viewer.parserHTML(html)));
  }

  getContents() {
    const content = this.editorController.sourceCodeMode ?
      this.sourceCodeComponent.getSourceCode() :
      this.options.outputTranslator.transform(this.outputRenderer.render(this.rootComponent.slot));
    return {
      content,
      styleSheets: this.docStyles
    }
  }

  getJSONLiteral() {
    const json = this.outputRenderer.render(this.rootComponent.slot).toJSON();
    return {
      json,
      styleSheets: this.docStyles
    }
  }

  private listen() {
    if (!this.contentDocument?.body) {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
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
      this.elementRef.style.height = Math.max(height, this.minHeight) + 'px';
    })
    this.resizeObserver.observe(this.contentDocument.body);
  }


  private static guardLastIsParagraph(fragment: Fragment) {
    const last = fragment.sliceContents(fragment.contentLength - 1)[0];
    if (last instanceof BlockComponent) {
      if (last.tagName === 'p') {
        if (last.slot.contentLength === 0) {
          last.slot.append(new BrComponent());
        }
        return;
      }
    }
    const p = new BlockComponent('p');
    p.slot.append(new BrComponent());
    fragment.append(p);
  }

  private static guardContentIsPre(fragment: Fragment, pre: PreComponent) {
    if (fragment.contentLength === 0) {
      fragment.append(pre);
    }
  }

  private static parserHTML(html: string) {
    return new DOMParser().parseFromString(html, 'text/html').body;
  }
}
