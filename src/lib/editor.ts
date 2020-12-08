import { from, Observable, of, Subject, Subscription } from 'rxjs';
import { Injectable, InjectionToken, Injector, NullInjector, Provider, ReflectiveInjector } from '@tanbo/di';

import {
  ComponentReader,
  Formatter,
  Lifecycle,
  OutputRenderer, Parser,
  Renderer,
} from './core/_api';
import { Viewer } from './workbench/viewer';
import {
  Device,
  DeviceOption,
  EditingMode,
  FullScreen,
  LibSwitch,
  Paths,
  StatusBar
} from './workbench/_api';
import { ComponentExample, ComponentStage } from './workbench/component-stage';
import { DialogManager, Workbench } from './workbench/workbench';
import { HTMLOutputTranslator, OutputTranslator } from './output-translator';
import { Toolbar, ToolEntity, ToolFactory } from './toolbar/_api';
import { EditorController } from './editor-controller';
import { FileUploader } from './uikit/forms/help';

/**
 * TextBus 初始化时的配置参数
 */
export interface EditorOptions<T> {
  /** 设置主题 */
  theme?: string;
  /** 设备宽度 */
  deviceOptions?: DeviceOption[];
  /** 默认是否全屏*/
  fullScreen?: boolean;
  /** 默认是否展开组件库 */
  expandComponentLibrary?: boolean;
  /** 设置最大历史栈 */
  historyStackSize?: number;
  /** 设置组件读取转换器 */
  componentReaders?: ComponentReader[];
  /** 设置格式转换器 */
  formatters?: Formatter[];
  /** 工具条配置 */
  toolbar?: (ToolFactory | ToolFactory[])[];
  /** 配置生命周期勾子 */
  hooks?: Lifecycle[];
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

export const EDITOR_OPTIONS = new InjectionToken('EDITOR_OPTIONS');
export const EDITABLE_DOCUMENT = new InjectionToken('EDITABLE_DOCUMENT');


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
  private changeEvent = new Subject<void>();

  private onUserWrite: Observable<void>;
  private userWriteEvent = new Subject<void>();

  private subs: Subscription[] = [];

  constructor(public selector: string | HTMLElement, public options: EditorOptions<T>) {
    this.onUserWrite = this.userWriteEvent.asObservable();
    if (typeof selector === 'string') {
      this.container = document.querySelector(selector);
    } else {
      this.container = selector;
    }
    this.onReady = this.readyEvent.asObservable();
    this.onChange = this.changeEvent.asObservable();

    this.stateController = new EditorController({
      readonly: false,
      expandComponentLibrary: true,
      sourceCodeMode: false,
      deviceType: 'PC',
      fullScreen: true
    });

    this.fullScreen(true)
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
      useValue: {
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
      }
    }, {
      provide: Renderer,
      useValue: new Renderer()
    }, {
      provide: OutputRenderer,
      useValue: new OutputRenderer()
    }, {
      provide: Parser,
      useValue: new Parser(options.componentReaders, options.formatters)
    }, {
      provide: OutputTranslator,
      useValue: new HTMLOutputTranslator()
    }, {
      provide: Injector,
      useFactory() {
        return rootInjector;
      }
    }, {
      provide: DialogManager,
      useClass: Workbench
    }];

    const rootInjector = new ReflectiveInjector(new NullInjector(), [
      Toolbar,
      Workbench,
      Device,
      EditingMode,
      FullScreen,
      LibSwitch,
      Paths,
      StatusBar,
      Viewer,
      ComponentStage,
      ...staticProviders
    ]);

    this.subs.push(
      rootInjector.get<Viewer>(Viewer).onReady.subscribe(() => {
        this.readyState = true;
        this.readyEvent.next();
      })
    );

    this.elementRef.append(
      rootInjector.get<Toolbar>(Toolbar).elementRef,
      rootInjector.get<Workbench>(Workbench).elementRef,
      rootInjector.get<StatusBar>(StatusBar).elementRef
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
    html = html + '';
    return new Promise((resolve) => {
      this.run(() => {
        // const el = Editor.parserHTML(html)
        // this.rootFragment.from(this.parser.parse(el));
        resolve();
      })
    })
  }

  /**
   * 获取 TextBus 的内容。
   */
  // getContents() {
  //   return {
  //     styleSheets: this.options.styleSheets,
  //     content: this.openSourceCodeMode ?
  //       this.getHTMLBySourceCodeMode() :
  //       this.outputTranslator.transform(this.outputRenderer.render(this.rootFragment))
  //   };
  // }

  /**
   * 获取 TextBus 内容的 JSON 字面量。
   */
  getJSONLiteral() {
    if (this.stateController.sourceCodeMode) {
      throw new Error('源代码模式下，不支持获取 JSON 字面量！');
    }
    // return {
    //   styleSheets: this.options.styleSheets,
    //   json: this.outputRenderer.render(this.rootFragment).toJSON()
    // };
  }

  /**
   * 应用工具方法
   * @param tool
   * @param params
   */
  invoke(tool: ToolEntity, params?: any) {
    // this.execCommand(tool.config, params, tool.instance.commander);
  }

  /**
   * 销毁 TextBus 实例。
   */
  destroy() {
    this.container.removeChild(this.elementRef);
    this.subs.forEach(s => s.unsubscribe());
    this.readyEvent.complete();
    this.changeEvent.complete();
    // this.history.destroy();
  }

  fullScreen(is: boolean) {
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
