import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { forwardRef, getAnnotations, Inject, Injectable, Injector, Provider, ReflectiveInjector } from '@tanbo/di';
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

@Injectable()
export class Viewer {
  onReady: Observable<void>;
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


  private sourceCodeComponent = new PreComponent('HTML');
  private outputRenderer = new OutputRenderer();
  private readyEvent = new Subject<void>();
  private viewUpdateEvent = new Subject<void>();
  private id: number = null;
  private minHeight = 400;
  private rootComponent: RootComponent;
  private parser: Parser;

  constructor(@Inject(forwardRef(() => EDITOR_OPTIONS)) private options: EditorOptions<any>,
              private componentStage: ComponentStage,
              private editorController: EditorController,
              private injector: Injector) {
    this.onReady = this.readyEvent.asObservable();
    this.onViewUpdated = this.viewUpdateEvent.asObservable();
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
    const selection = new TBSelection(this.contentDocument, renderer, (this.options.plugins || []));
    const parser = this.parser = new Parser(componentAnnotations.map(c => c.loader), this.options.formatters);

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
    }];
    const viewInjector = new ReflectiveInjector(this.injector, [
      Input,
      HistoryManager,
      RootComponent,
      ...viewProviders
    ]);

    const rootComponent = this.rootComponent = viewInjector.get(RootComponent);
    const toolbar = viewInjector.get(Toolbar);

    toolbar.setup(viewInjector);
    this.componentStage.setup(viewInjector);


    rootComponent.onChange.pipe(debounceTime(1)).subscribe(() => {
      (this.options.plugins || []).forEach(plugin => {
        plugin.onRenderingBefore?.();
      })
      if (this.editorController.sourceCodeMode) {
        Viewer.guardContentIsPre(rootComponent.slot, this.sourceCodeComponent);
      } else {
        Viewer.guardLastIsParagraph(rootComponent.slot);
      }
      renderer.render(rootComponent.slot, this.contentDocument.body);
      selection.restore();
      (this.options.plugins || []).forEach(plugin => {
        plugin.onViewUpdated?.();
      })
      this.viewUpdateEvent.next();
    })

    this.editorController.onStateChange.pipe(map(b => b.sourceCodeMode), distinctUntilChanged()).subscribe(b => {
      selection.removeAllRanges();
      this.sourceCodeMode = b;
      if (b) {
        const html = this.options.outputTranslator.transform(this.outputRenderer.render(this.rootComponent.slot));
        this.rootComponent.slot.clean();
        this.sourceCodeComponent.slot.clean();
        this.sourceCodeComponent.slot.append(pretty(html));
        this.rootComponent.slot.append(this.sourceCodeComponent);
      } else {
        const html = this.getHTMLBySourceCodeMode();
        const dom = Viewer.parserHTML(html)
        this.rootComponent.slot.from(this.parser.parse(dom));
      }
    })

    const dom = Viewer.parserHTML(this.options.contents || '<p><br></p>');
    rootComponent.slot.from(parser.parse(dom));
    const rootAnnotation = getAnnotations(RootComponent).getClassMetadata(Component).params[0] as Component;
    rootAnnotation.interceptor.setup(viewInjector);
    componentAnnotations.forEach(c => {
      c.interceptor?.setup(viewInjector);
    });

    (this.options.plugins || []).forEach(plugin => {
      plugin.setup(viewInjector);
    })

    viewInjector.get(HistoryManager).startListen();
  }

  updateContent(html: string) {
    this.rootComponent.slot.from(this.parser.parse(Viewer.parserHTML(html)));
  }

  getContents() {
    return this.editorController.sourceCodeMode ?
      this.getHTMLBySourceCodeMode() :
      this.options.outputTranslator.transform(this.outputRenderer.render(this.rootComponent.slot));
  }

  getJSONLiteral() {
    return this.outputRenderer.render(this.rootComponent.slot).toJSON();
  }

  private getHTMLBySourceCodeMode() {
    return this.sourceCodeComponent.slot.sliceContents(0).map(i => {
      return typeof i === 'string' ? i.trim() : '';
    }).join('');
  }

  private listen() {
    // @ts-ignore
    const resizeObserver = new ResizeObserver(() => {
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
    resizeObserver.observe(this.contentDocument.body);
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
    if (pre.slot.contentLength === 0) {
      pre.slot.append(new BrComponent());
    }
  }

  private static parserHTML(html: string) {
    return new DOMParser().parseFromString(html, 'text/html').body;
  }
}
