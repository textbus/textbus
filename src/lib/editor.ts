import { from, Observable, of, Subject, Subscription } from 'rxjs';
import {
  Injectable,
  InjectionToken,
  Injector,
  NullInjector,
  Provider,
  ReflectiveInjector,
  Type
} from '@tanbo/di';

import {
  AbstractComponent,
  Formatter,
  OutputRenderer,
  TBPlugin
} from './core/_api';
import { Viewer } from './workbench/viewer';
import {
  Device,
  DeviceOption,
  Dialog,
  EditingMode,
  FullScreen,
  LibSwitch,
  StatusBar
} from './workbench/_api';
import { ComponentExample, ComponentStage } from './workbench/component-stage';
import { Workbench } from './workbench/workbench';
import { HTMLOutputTranslator, OutputTranslator } from './output-translator';
import { Toolbar, ToolFactory } from './toolbar/_api';
import { EditorController } from './editor-controller';
import { FileUploader } from './uikit/forms/help';
import { makeError } from './_utils/make-error';

/**
 * TextBus 初始化时的配置参数
 */
export interface EditorOptions<T> {
  /** 设置主题 */
  theme?: string;
  /** 配置设备选项 */
  deviceOptions?: DeviceOption[];
  /** 指定设备类型 */
  deviceType?: string;
  /** 默认是否全屏*/
  fullScreen?: boolean;
  /** 默认是否展开组件库 */
  expandComponentLibrary?: boolean;
  /** 设置最大历史栈 */
  historyStackSize?: number;
  /** 声明组件集合 */
  components?: Array<Type<AbstractComponent>>;
  /** 设置格式转换器 */
  formatters?: Formatter[];
  /** 工具条配置 */
  toolbar?: (ToolFactory | ToolFactory[])[];
  /** 扩展增强插件 */
  plugins?: TBPlugin[];
  /** 配置文档的默认样式 */
  styleSheets?: string[];
  /** 配置文档编辑状态下用到的样式 */
  editingStyleSheets?: string[];
  /** 设置初始化 TextBus 时的默认内容 */
  contents?: string;
  /** 设置可选的自定义组件 */
  componentLibrary?: ComponentExample[];
  /** 设置输出转换器 */
  outputTranslator?: OutputTranslator<T>;

  /** 当某些工具需要上传资源时的调用函数，调用时会传入上传资源的类型，如 image、video、audio等，该函数返回一个字符串，作为资源的 url 地址 */
  uploader?(type: string): (string | Promise<string> | Observable<string>);
}

export const EDITOR_OPTIONS = new InjectionToken<EditorOptions<any>>('EDITOR_OPTIONS');
export const EDITABLE_DOCUMENT = new InjectionToken<Document>('EDITABLE_DOCUMENT');
export const EDITABLE_DOCUMENT_CONTAINER = new InjectionToken<HTMLElement>('EDITABLE_DOCUMENT_CONTAINER');
export const EDITOR_SCROLL_CONTAINER = new InjectionToken<HTMLElement>('EDITOR_SCROLL_CONTAINER');

const editorErrorFn = makeError('Editor');

/**
 * TextBus 主类
 */
@Injectable()
export class Editor<T = any> {
  /** 当 TextBus 可用时触发 */
  readonly onReady: Observable<void>;
  /** 当 TextBus 内容发生变化时触发 */
  readonly onChange: Observable<void>;

  readonly elementRef = document.createElement('div');

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
  private readonly rootInjector: Injector;

  private subs: Subscription[] = [];

  constructor(public selector: string | HTMLElement, public options: EditorOptions<T>) {
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
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
      readonly: true,
      expandComponentLibrary: options.expandComponentLibrary,
      sourceCodeMode: false,
      deviceType: defaultDeviceType,
      fullScreen: options.fullScreen
    });

    this.subs.push(this.stateController.onStateChange.subscribe(state => {
      this.fullScreen(state.fullScreen);
    }))

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

    const rootInjector = new ReflectiveInjector(new NullInjector(), [
      Toolbar,
      Workbench,
      Device,
      Dialog,
      EditingMode,
      FullScreen,
      LibSwitch,
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
    return new Promise((resolve) => {
      this.run(() => {
        this.viewer.updateContent(html + '');
        resolve();
      })
    })
  }

  /**
   * 获取 TextBus 的内容。
   */
  getContents() {
    return this.viewer.getContents();
  }

  /**
   * 获取 TextBus 内容的 JSON 字面量。
   */
  getJSONLiteral() {
    if (this.stateController.sourceCodeMode) {
      throw editorErrorFn('json results cannot be obtained in source editing mode.');
    }
    return this.viewer.getJSONLiteral();
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
