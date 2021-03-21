import { from, Observable, of, Subject, Subscription } from 'rxjs';
import {
  Injectable,
  Injector,
  NullInjector,
  Provider,
  ReflectiveInjector,
} from '@tanbo/di';

import {
  OutputRenderer, VElementLiteral
} from './core/_api';
import {
  ControlPanel,
  Dialog,
  Viewer,
} from './ui/_api';
import { HTMLOutputTranslator, OutputTranslator } from './output-translator';
import { EditorController } from './editor-controller';
import { FileUploader } from './ui/uikit/forms/help';
import { makeError } from './_utils/make-error';
import { ComponentInjectors } from './component-injectors';
import { EditorOptions } from './editor-options';
import {
  EDITOR_OPTIONS, UI_BOTTOM_CONTAINER, UI_DOCUMENT_CONTAINER,
  UI_RIGHT_CONTAINER, UI_SCROLL_CONTAINER,
  UI_TOP_CONTAINER,
  UI_VIEWER_CONTAINER,
} from './inject-tokens';
import { createElement } from './ui/uikit/_api';
import { map } from 'rxjs/operators';

const editorErrorFn = makeError('Editor');

export interface OutputContent<T> {
  content: T;
  links: Array<{ [key: string]: string }>;
  styleSheets: string[];
  scripts: string[];
}

/**
 * TextBus 主类
 */
@Injectable()
export class Editor<T = any> {
  /** 当 TextBus 可用时触发 */
  readonly onReady: Observable<void>;
  /** 当 TextBus 内容发生变化时触发 */
  readonly onChange: Observable<void>;

  readonly elementRef: HTMLElement;

  readonly stateController: EditorController;

  injector: Injector = null;

  set readonly(b: boolean) {
    this.stateController.readonly = b;
  }

  get readonly() {
    return this.stateController.readonly;
  }

  private readonly container: HTMLElement;
  private readyState = false;
  private tasks: Array<() => void> = [];

  private readyEvent = new Subject<void>();
  private viewer: Viewer;

  private subs: Subscription[] = [];

  constructor(public selector: string | HTMLElement, public options: EditorOptions<T>) {
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
    if (!this.container || !(this.container instanceof HTMLElement)) {
      throw editorErrorFn('selector is not an HTMLElement, or the CSS selector cannot find a DOM element in the document.')
    }
    this.onReady = this.readyEvent.asObservable();

    this.stateController = new EditorController({
      readonly: false,
    });

    const fileUploader: FileUploader = {
      upload: (type: string): Observable<string> => {
        if (typeof this.options.uploader === 'function') {
          // if (this.selection.rangeCount === 0) {
          //   alert('请先选择插入资源位置！');
          //   return throwError(new Error('请先选择插入资源位置！'));
          // }
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
    };
    const topContainer = createElement('div', {
      classes: ['textbus-ui-top']
    });
    const bottomContainer = createElement('div', {
      classes: ['textbus-ui-bottom', 'textbus-status-bar']
    });
    let viewer: HTMLElement;
    let rightContainer: HTMLElement;
    let docContainer: HTMLElement;
    let loading: HTMLElement;
    let scroll: HTMLElement;
    let wrapper: HTMLElement;

    this.elementRef = createElement('div', {
      classes: ['textbus-container'],
      children: [
        viewer = createElement('div', {
          classes: ['textbus-ui-middle'],
          children: [
            createElement('div', {
              classes: ['textbus-ui-viewer'],
              children: [
                scroll = createElement('div', {
                  classes: ['textbus-ui-scroll'],
                  children: [
                    wrapper = createElement('div', {
                      classes: ['textbus-ui-doc-wrapper'],
                      children: [
                        docContainer = createElement('div', {
                          classes: ['textbus-ui-doc']
                        })
                      ]
                    }),
                    loading = createElement('div', {
                      classes: ['textbus-loading'],
                      props: {
                        innerHTML: 'TextBus'.split('').map(t => `<div>${t}</div>`).join('')
                      }
                    })
                  ]
                }),
                rightContainer = createElement('div', {
                  classes: ['textbus-ui-right']
                })
              ]
            })
          ]
        })
      ]
    })

    const staticProviders: Provider[] = [{
      provide: Editor,
      useValue: this,
    }, {
      provide: UI_TOP_CONTAINER,
      useFactory: () => {
        this.elementRef.prepend(topContainer);
        return topContainer;
      }
    }, {
      provide: UI_SCROLL_CONTAINER,
      useValue: scroll
    }, {
      provide: UI_VIEWER_CONTAINER,
      useValue: viewer
    }, {
      provide: UI_DOCUMENT_CONTAINER,
      useValue: docContainer
    }, {
      provide: UI_RIGHT_CONTAINER,
      useValue: rightContainer
    }, {
      provide: UI_BOTTOM_CONTAINER,
      useFactory: () => {
        this.elementRef.append(bottomContainer);
        return bottomContainer;
      }
    }, {
      provide: EDITOR_OPTIONS,
      useValue: options
    }, {
      provide: EditorController,
      useValue: this.stateController
    }, {
      provide: FileUploader,
      useValue: fileUploader
    }, {
      provide: OutputRenderer,
      useValue: new OutputRenderer()
    }, {
      provide: OutputTranslator,
      useValue: new HTMLOutputTranslator()
    }, {
      provide: Injector,
      useFactory() {
        return rootInjector;
      }
    }];

    const rootInjector = new ReflectiveInjector(new NullInjector(), [
      ComponentInjectors,
      Dialog,
      Viewer,
      ControlPanel,
      ...staticProviders
    ]);

    this.viewer = rootInjector.get(Viewer);
    this.onChange = this.viewer.onViewUpdated;

    this.subs.push(
      this.viewer.onReady.subscribe(injector => {
        this.injector = injector;
        this.tasks.forEach(fn => fn());
        (options.ui || []).forEach(ui => {
          ui.onReady?.(injector);
        })
        setTimeout(() => {
          loading.classList.add('textbus-loading-done');
          wrapper.classList.add('textbus-dashboard-ready');
          setTimeout(() => {
            scroll.removeChild(loading);
          }, 300);
        }, 1000)
        this.readyState = true;

        this.readyEvent.next();
      }),
      this.stateController.onStateChange.pipe(map(s => s.readonly)).subscribe(b => {
        if (b) {
          this.elementRef.classList.add('textbus-readonly');
        } else {
          this.elementRef.classList.remove('textbus-readonly')
        }
      })
    );

    docContainer.appendChild(rootInjector.get(Viewer).elementRef);

    (options.ui || []).forEach(ui => {
      ui.setup(rootInjector);
    })

    if (options.theme) {
      this.elementRef.classList.add('textbus-theme-' + options.theme);
    }
    this.container.appendChild(this.elementRef);
  }

  /**
   * 设置 TextBus 编辑器的内容。
   * @param html
   */
  setContents(html: string) {
    return new Promise((resolve) => {
      this.run(() => {
        this.viewer.updateContent(html + '');
        resolve(true);
      })
    })
  }

  /**
   * 获取 TextBus 的内容。
   */
  getContents(): OutputContent<T> {
    return this.viewer.getContents();
  }

  /**
   * 获取 TextBus 内容的 JSON 字面量。
   */
  getJSONLiteral(): OutputContent<VElementLiteral> {
    return this.viewer.getJSONLiteral() as any as OutputContent<VElementLiteral>;
  }

  /**
   * 销毁 TextBus 实例。
   */
  destroy() {
    this.subs.forEach(s => s.unsubscribe());
    // const rootInjector = this.rootInjector;
    // [Toolbar,
    //   Device,
    //   Dialog,
    //   FullScreen,
    //   LibSwitch,
    //   StatusBar,
    //   Viewer,
    //   ComponentStage,
    //   ControlPanel,
    //   Workbench,
    // ].forEach(c => {
    //   rootInjector.get(c as Type<{ destroy(): void }>).destroy();
    // })
    this.container.removeChild(this.elementRef);
  }

  private fullScreen(is: boolean) {
    is ?
      this.elementRef.classList.add('textbus-container-full-screen') :
      this.elementRef.classList.remove('textbus-container-full-screen')
  }

  private run(fn: () => void) {
    if (!this.readyState) {
      this.tasks.push(fn);
      return;
    }
    fn();
  }
}
