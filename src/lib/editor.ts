import { from, Observable, of, Subject, Subscription } from 'rxjs';
import {
  Injectable,
  Injector,
  NullInjector,
  Provider,
  ReflectiveInjector,
  Type
} from '@tanbo/di';

import {
  OutputRenderer, VElementLiteral
} from './core/_api';
import {
  Device,
  Dialog,
  EditingMode,
  FullScreen,
  LibSwitch,
  StatusBar,
  ControlPanel,
  Viewer,
  ComponentStage,
  Workbench
} from './workbench/_api';
import { HTMLOutputTranslator, OutputTranslator } from './output-translator';
import { Toolbar } from './toolbar/_api';
import { EditorController } from './editor-controller';
import { FileUploader } from './uikit/forms/help';
import { makeError } from './_utils/make-error';
import { ComponentInjectors } from './component-injectors';
import { EditorOptions } from './editor-options';
import { EDITABLE_DOCUMENT_CONTAINER, EDITOR_OPTIONS, EDITOR_SCROLL_CONTAINER } from './inject-tokens';

const editorErrorFn = makeError('Editor');

export interface OutputContent<T> {
  content: T;
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
  /** 根元素 */
  readonly elementRef = document.createElement('div');

  /**编辑器状态控制器 */
  readonly stateController: EditorController;

  /**Viewer实例 */
  injector: Injector = null;

  set readonly(b: boolean) {
    this.stateController.readonly = b;
  }

  get readonly() {
    return this.stateController.readonly;
  }

  /**编辑器container */
  private readonly container: HTMLElement;

  /**是否已准备好 */
  private readyState = false;
  /**渲染任务 */
  private tasks: Array<() => void> = [];

  /**当TextBus准备就绪时 触发 */
  private readyEvent = new Subject<void>();

  /**视图 */
  private viewer: Viewer;
  /**根注入器 */
  private readonly rootInjector: Injector;

  /**绑定rxjs,用于取消订阅 */
  private subs: Subscription[] = [];

  constructor(public selector: string | HTMLElement, public options: EditorOptions<T>) {
    console.log('editor-options:', options);
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
    if (!this.container || !(this.container instanceof HTMLElement)) {
      throw editorErrorFn('selector is not an HTMLElement, or the CSS selector cannot find a DOM element in the document.')
    }
    /**转化为Observerable */
    this.onReady = this.readyEvent.asObservable();
    let defaultDeviceType = options.deviceType;

    if (!defaultDeviceType) {
      for (const item of (options.deviceOptions || [])) {
        if (item.default) {
          defaultDeviceType = item.label;
        }
      }
    }

    this.stateController = new EditorController({
      readonly: false,
      expandComponentLibrary: options.expandComponentLibrary,
      sourceCodeMode: false,
      deviceType: defaultDeviceType,
      fullScreen: options.fullScreen
    });

    /**监听编辑器状态改变 */
    this.subs.push(this.stateController.onStateChange.subscribe(state => {
      this.fullScreen(state.fullScreen);
    }))

    /**上传 */
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

    /**编辑器注入依赖 */
    const staticProviders: Provider[] = [{
      provide: Editor,
      useValue: this,
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
    }, {
      provide: EDITABLE_DOCUMENT_CONTAINER,
      useFactory(workbench: Workbench) {
        return workbench.tablet;
      },
      deps: [Workbench]
    }, {
      provide: EDITOR_SCROLL_CONTAINER,
      useFactory(workbench: Workbench) {
        return workbench.editableArea;
      },
      deps: [Workbench]
    }];

    /**根注入器 */
    const rootInjector = new ReflectiveInjector(new NullInjector(), [
      ComponentInjectors,
      Toolbar,
      Workbench,
      Device,
      Dialog,
      EditingMode,
      FullScreen,
      LibSwitch,
      ControlPanel,
      StatusBar,
      Viewer,
      ComponentStage,
      ...staticProviders
    ]);
    this.rootInjector = rootInjector;

    this.viewer = rootInjector.get(Viewer);

    this.onChange = this.viewer.onViewUpdated;

    this.subs.push(
      this.viewer.onReady.subscribe(injector => {
        this.injector = injector;
        this.tasks.forEach(fn => fn());
        this.readyState = true;
        this.readyEvent.next();
      })
    );

    this.elementRef.append(
      rootInjector.get(Toolbar).elementRef,
      rootInjector.get(Workbench).elementRef,
      rootInjector.get(StatusBar).elementRef
    )

    this.elementRef.classList.add('textbus-container');

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
    return new Promise<void>((resolve) => {
      this.run(() => {
        this.viewer.updateContent(html + '');
        resolve();
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
    if (this.stateController.sourceCodeMode) {
      throw editorErrorFn('json results cannot be obtained in source editing mode.');
    }
    return this.viewer.getJSONLiteral() as any as OutputContent<VElementLiteral>;
  }

  /**
   * 销毁 TextBus 实例。
   */
  destroy() {
    this.subs.forEach(s => s.unsubscribe());
    const rootInjector = this.rootInjector;
    [Toolbar,
      Device,
      Dialog,
      EditingMode,
      FullScreen,
      LibSwitch,
      StatusBar,
      Viewer,
      ComponentStage,
      ControlPanel,
      Workbench,
    ].forEach(c => {
      rootInjector.get(c as Type<{ destroy(): void }>).destroy();
    })
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
