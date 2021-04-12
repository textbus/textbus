import { from, fromEvent, Observable, of, Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  getAnnotations,
  Injector,
  NullInjector,
  ReflectiveInjector, Type,
} from '@tanbo/di';

import {
  AbstractComponent, BackboneAbstractComponent, BranchAbstractComponent,
  BrComponent,
  Component, DivisionAbstractComponent, Fragment, LeafAbstractComponent,
  OutputRenderer, Parser, Renderer, TBRange, TBSelection, VElementLiteral
} from './core/_api';
import {
  UIControlPanel,
  UIDialog, Input, Layout, FileUploader, TBPlugin, PasteHandlePlugin, UIMessage
} from './ui/_api';
import { HTMLOutputTranslator, OutputTranslator } from './output-translator';
import { EditorController } from './editor-controller';
import { makeError } from './_utils/make-error';
import { ComponentInjectors } from './component-injectors';
import { EditorOptions } from './editor-options';
import { EDITABLE_DOCUMENT, EDITOR_OPTIONS } from './inject-tokens';
import { RootComponent } from './root-component';
import { TBHistory } from './history';
import { BlockComponent } from './components/block.component';
import { i18n_zh_CN } from './i18n/zh_CN';
import { I18n } from './i18n';

declare const ResizeObserver: any;
const editorErrorFn = makeError('Editor');

export interface OutputContent<T = any> {
  content: T;
  links: Array<{ [key: string]: string }>;
  styleSheets: string[];
  scripts: string[];
}

/**
 * TextBus 主类
 */
export class Editor {
  /** 当 TextBus 可用时触发 */
  readonly onReady: Observable<void>;
  /** 当 TextBus 内容发生变化时触发 */
  readonly onChange: Observable<void>;
  /** 组件状态控制器 */
  readonly stateController: EditorController = null;
  /** 编辑器注入器，在编辑准备完成时可用 */
  injector: Injector = null;

  set readonly(b: boolean) {
    this.stateController.readonly = b;
  }

  get readonly() {
    return this.stateController.readonly;
  }

  private readonly container: HTMLElement;

  private componentAnnotations: Component[];
  private defaultPlugins: Type<TBPlugin>[] = [
    UIDialog,
    UIControlPanel,
    UIMessage,
    PasteHandlePlugin
  ];
  private readyState = false;
  private tasks: Array<() => void> = [];

  private layout: Layout;

  private readyEvent = new Subject<void>();
  private resizeObserver: any;

  private subs: Subscription[] = [];
  private changeEvent = new Subject<void>()

  constructor(public selector: string | HTMLElement, public options: EditorOptions) {
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
    if (!this.container || !(this.container instanceof HTMLElement)) {
      throw editorErrorFn('selector is not an HTMLElement, or the CSS selector cannot find a DOM element in the document.')
    }
    this.onReady = this.readyEvent.asObservable();
    this.onChange = this.changeEvent.asObservable();
    this.stateController = new EditorController({
      readonly: false,
      sourcecodeMode: false
    });

    const i18n = new I18n(i18n_zh_CN, options.i18n);

    const rootInjector = new ReflectiveInjector(new NullInjector(), [Layout, {
      provide: EditorController,
      useValue: this.stateController
    }, {
      provide: I18n,
      useValue: i18n
    }]);
    const layout = rootInjector.get(Layout);
    layout.setTheme(options.theme);
    this.layout = layout;
    this.subs.push(layout.onReady.subscribe(contentDocument => {
      const injector = this.bootstrap(rootInjector, contentDocument);
      this.init(injector);
    }))
    this.container.appendChild(layout.container);
  }

  /**
   * 设置 TextBus 编辑器的内容。
   * @param html
   */
  setContents(html: string) {
    return new Promise<void>((resolve) => {
      this.run(() => {
        const parser = this.injector.get(Parser);
        const fragment = parser.parse(Parser.parserHTML(html));
        this.injector.get(RootComponent).slot.from(fragment);
        resolve();
      })
    })
  }

  /**
   * 获取 TextBus 的内容。
   */
  getContents(): OutputContent<string> {
    const metadata = this.getOutputComponentMetadata()

    const outputTranslator = this.injector.get(OutputTranslator as Type<OutputTranslator>);
    const outputRenderer = this.injector.get(OutputRenderer);
    const rootComponent = this.injector.get(RootComponent);

    const content = outputTranslator.transform(outputRenderer.render(rootComponent));
    return {
      content,
      links: metadata.links,
      styleSheets: metadata.styles,
      scripts: metadata.scripts
    }
  }

  /**
   * 获取 TextBus 内容的 JSON 字面量。
   */
  getJSONLiteral(): OutputContent<VElementLiteral> {
    const outputRenderer = this.injector.get(OutputRenderer);
    const rootComponent = this.injector.get(RootComponent);
    const json = outputRenderer.render(rootComponent).toJSON();
    const metadata = this.getOutputComponentMetadata()
    return {
      content: json,
      links: metadata.links,
      styleSheets: metadata.styles,
      scripts: metadata.scripts
    }
  }

  /**
   * 销毁 TextBus 实例。
   */
  destroy() {
    this.subs.forEach(s => s.unsubscribe());
    [Input, Layout, ComponentInjectors].forEach(i => {
      this.injector.get(i as Type<{ destroy(): void }>).destroy();
    });
    [...(this.defaultPlugins), ...(this.options.plugins || [])].forEach(p => {
      this.injector.get(p).onDestroy?.();
    })
    this.container.removeChild(this.layout.container);
  }

  private getOutputComponentMetadata() {
    const classes = this.getReferencedComponents();

    const styles: string[] = [...(this.options.styleSheets || '')];
    const scripts: string[] = [];
    const links: Array<{ [key: string]: string }> = [];

    classes.forEach(c => {
      const annotation = getAnnotations(c).getClassMetadata(Component).decoratorArguments[0] as Component;
      if (annotation.styles) {
        styles.push(...annotation.styles.filter(i => i));
      }
      if (annotation.scripts) {
        scripts.push(...annotation.scripts.filter(i => i));
      }
      if (annotation.links) {
        links.push(...annotation.links);
      }
    })
    return {
      links,
      styles: Array.from(new Set(styles)).map(i => Editor.cssMin(i)),
      scripts: Array.from(new Set(scripts))
    }
  }

  private getReferencedComponents() {

    function getComponentCollection(component: AbstractComponent) {
      const collection: AbstractComponent[] = [component];
      const fragments: Fragment[] = [];
      if (component instanceof DivisionAbstractComponent) {
        fragments.push(component.slot)
      } else if (component instanceof BranchAbstractComponent) {
        fragments.push(...component.slots);
      } else if (component instanceof BackboneAbstractComponent) {
        fragments.push(...Array.from(component));
      }
      fragments.forEach(fragment => {
        fragment.sliceContents().forEach(i => {
          if (i instanceof AbstractComponent) {
            collection.push(...getComponentCollection(i));
          }
        })
      })
      return collection;
    }

    const instances = getComponentCollection(this.injector.get(RootComponent));

    return Array.from(new Set(instances.map(i => i.constructor)))
  }

  private init(injector: Injector) {
    this.injector = injector;
    const contentDocument = injector.get(EDITABLE_DOCUMENT);
    const layout = injector.get(Layout);
    const rootComponent = injector.get(RootComponent);
    const selection = injector.get(TBSelection);
    const renderer = injector.get(Renderer);
    const parser = injector.get(Parser);
    this.subs.push(
      rootComponent.onChange.pipe(debounceTime(1)).subscribe(() => {
        const isEmpty = rootComponent.slot.length === 0;
        Editor.guardLastIsParagraph(rootComponent.slot);
        if (isEmpty && selection.firstRange) {
          const position = selection.firstRange.findFirstPosition(rootComponent.slot);
          selection.firstRange.setStart(position.fragment, position.index);
          selection.firstRange.setEnd(position.fragment, position.index);
        }
        renderer.render(rootComponent, contentDocument.body);
        selection.restore();
      }),

      fromEvent(contentDocument, 'click').subscribe((ev: MouseEvent) => {
        const sourceElement = ev.target as Node;
        const focusNode = this.findFocusNode(sourceElement, renderer);
        if (!focusNode || focusNode === sourceElement) {
          return;
        }
        const position = renderer.getPositionByNode(focusNode);
        if (position.endIndex - position.startIndex === 1) {
          const content = position.fragment.getContentAtIndex(position.startIndex);
          if (content instanceof LeafAbstractComponent) {
            if (!selection.firstRange) {
              const range = new TBRange(contentDocument.createRange(), renderer);
              selection.addRange(range);
            }
            selection.firstRange.setStart(position.fragment, position.endIndex);
            selection.firstRange.collapse();
            selection.restore();
          }
        }
      }),
      renderer.onViewUpdated.subscribe(() => {
        this.changeEvent.next();
      })
    )

    const dom = Parser.parserHTML(this.options.contents || '<p><br></p>');
    rootComponent.slot.from(parser.parse(dom));
    this.listen(layout.iframe, layout.workbench, contentDocument);

    [...(this.defaultPlugins), ...(this.options.plugins || [])].forEach(f => {
      injector.get(f).setup();
    })
    const input = injector.get(Input);
    if (typeof this.options.onSave === 'function') {
      input.addKeymap({
        keymap: {
          ctrlKey: true,
          key: 's'
        },
        action: () => {
          this.options.onSave();
        }
      })
    }
    injector.get(TBHistory).record();

    this.readyState = true;
    this.readyEvent.next();
    this.tasks.forEach(fn => fn());
  }

  private bootstrap(rootInjector: Injector, contentDocument: Document): Injector {
    const renderer = new Renderer();
    const selection = new TBSelection(
      contentDocument,
      fromEvent(contentDocument, 'selectionchange'),
      renderer);

    this.componentAnnotations = [RootComponent, ...(this.options.components || []), BrComponent].map(c => {
      return getAnnotations(c).getClassMetadata(Component).decoratorArguments[0] as Component
    })

    this.setDocStyle(this.componentAnnotations, contentDocument);

    const parser = new Parser(this.componentAnnotations.map(c => c.loader), this.options.formatters);
    const componentInjectors = new ComponentInjectors();
    const editorInjector = new ReflectiveInjector(rootInjector, [
      ...this.defaultPlugins,
      Input,
      TBHistory,
      RootComponent, {
        provide: EDITABLE_DOCUMENT,
        useValue: contentDocument
      }, {
        provide: EDITOR_OPTIONS,
        useValue: this.options
      }, {
        provide: Editor,
        useValue: this
      }, {
        provide: OutputRenderer,
        useValue: new OutputRenderer()
      }, {
        provide: OutputTranslator,
        useValue: new HTMLOutputTranslator()
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
        provide: ComponentInjectors,
        useValue: componentInjectors
      }, {
        provide: FileUploader,
        useFactory: (message: UIMessage, i18n: I18n) => {
          return {
            upload: (type: string): Observable<string> => {
              if (selection.rangeCount === 0) {
                message.message(i18n.get('editor.noSelection'));
                return of('');
              }
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
          }
        },
        deps: [UIMessage, I18n]
      }
    ])

    const customInjector: Injector = new ReflectiveInjector(editorInjector, [
      ...(this.options.providers || []),
      ...(this.options.plugins || []), {
        provide: Injector,
        useFactory() {
          return customInjector
        }
      }
    ]);
    [RootComponent, ...(this.options.components || [])].forEach(c => {
      const metadata = getAnnotations(c).getClassMetadata(Component);
      const annotation = metadata.decoratorArguments[0] as Component;
      componentInjectors.set(c, new ReflectiveInjector(customInjector, annotation.providers || []));
    });
    return customInjector;
  }

  private setDocStyle(componentAnnotations: Component[], contentDocument: Document) {
    const links: Array<{ [key: string]: string }> = [];

    const componentStyles = componentAnnotations.map(c => {
      if (Array.isArray(c.links)) {
        links.push(...c.links);
      }
      return [c.styles?.join('') || '', c.editModeStyles?.join('') || ''].join('')
    }).join('')

    links.forEach(link => {
      const linkEle = contentDocument.createElement('link');
      Object.assign(linkEle, link);
      contentDocument.head.appendChild(linkEle);
    })
    const docStyles = Editor.cssMin([componentStyles, ...(this.options.styleSheets || [])].join(''));
    const styleEl = contentDocument.createElement('style');
    styleEl.innerHTML = Editor.cssMin([...docStyles, ...(this.options.editingStyleSheets || [])].join(''));
    contentDocument.head.append(styleEl);
  }

  private run(fn: () => void) {
    if (!this.readyState) {
      this.tasks.push(fn);
      return;
    }
    fn();
  }

  private listen(iframe: HTMLIFrameElement, container: HTMLElement, contentDocument: Document) {
    if (!contentDocument?.body) {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      const childBody = contentDocument.body;
      const lastChild = childBody.lastChild;
      let height = 0;
      if (lastChild) {
        if (lastChild.nodeType === Node.ELEMENT_NODE) {
          height = (lastChild as HTMLElement).getBoundingClientRect().bottom;
        } else {
          const div = contentDocument.createElement('div');
          childBody.appendChild(div);
          height = div.getBoundingClientRect().bottom;
          childBody.removeChild(div);
        }
      }
      iframe.style.height = Math.max(height, container.offsetHeight) + 'px';
    })
    this.resizeObserver.observe(contentDocument.body);
  }

  private findFocusNode(node: Node, renderer: Renderer): Node {
    const position = renderer.getPositionByNode(node);
    if (!position) {
      const parentNode = node.parentNode;
      if (parentNode) {
        return this.findFocusNode(parentNode, renderer);
      }
      return null;
    }
    return node;
  }

  private static cssMin(str: string) {
    return str
      .replace(/\s*(?=[>{}:;,[])/g, '')
      .replace(/([>{}:;,])\s*/g, '$1')
      .replace(/;}/g, '}').replace(/\s+/, ' ').trim();
  }

  private static guardLastIsParagraph(fragment: Fragment) {
    const last = fragment.sliceContents(fragment.length - 1)[0];
    if (last instanceof BlockComponent) {
      return;
    }
    const p = new BlockComponent('p');
    p.slot.append(new BrComponent());
    fragment.append(p);
  }
}
