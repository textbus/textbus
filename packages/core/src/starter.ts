import { Injector, NullInjector, Provider, ReflectiveInjector, Type } from '@tanbo/di'
import { Observable, Subject } from '@tanbo/stream'

import { ComponentInstance, Formatter, Component } from './model/_api'
import {
  NativeNode,
  History,
  RootComponentRef,
  LifeCycle,
  Renderer,
  COMPONENT_LIST,
  FORMATTER_LIST,
  Commander,
  Registry,
  Keyboard,
  OutputRenderer,
  Query,
  Selection,
  Translator,
  NativeSelectionBridge,
  NativeRenderer,
  USE_CONTENT_EDITABLE,
  CoreHistory
} from './foundation/_api'
import { makeError } from './_utils/make-error'

const starterErrorFn = makeError('Starter')

/**
 * TextBus 核心配置
 */
export interface TextBusConfig {
  /** 组件列表 */
  components: Component[]
  /** 格式列表 */
  formatters: Formatter[]
  /** 跨平台及基础扩展实现的提供者 */
  providers: Provider[]
  /** 使用 contentEditable 作为编辑器控制可编辑范围 */
  useContentEditable?: boolean

  setup?(starter: Starter): void
}

/**
 * TextBus 内核启动器
 */
export class Starter extends ReflectiveInjector {
  onReady: Observable<void>
  private readyEvent = new Subject<void>()

  constructor(public config: TextBusConfig) {
    super(new NullInjector(), [
      ...config.providers,
      {
        provide: COMPONENT_LIST,
        useValue: config.components
      }, {
        provide: FORMATTER_LIST,
        useValue: config.formatters
      }, {
        provide: RootComponentRef,
        useValue: {}
      },
      {
        provide: USE_CONTENT_EDITABLE,
        useValue: config.useContentEditable
      },
      {
        provide: History,
        useClass: CoreHistory
      },
      Commander,
      Registry,
      Keyboard,
      LifeCycle,
      OutputRenderer,
      Query,
      Renderer,
      Selection,
      Translator,
      {
        provide: Starter,
        useFactory: () => this
      },
      {
        provide: Injector,
        useFactory: () => {
          return this
        }
      }, {
        provide: NativeSelectionBridge,
        useFactory() {
          throw starterErrorFn('You must implement the `NativeSelectionBridge` interface to start TextBus!')
        }
      }, {
        provide: NativeRenderer,
        useFactory() {
          throw starterErrorFn('You must implement the `NativeRenderer` interface to start TextBus!')
        }
      }
    ])
    this.onReady = this.readyEvent.asObservable()
    config.setup?.(this)
  }

  /**
   * 启动一个 TextBus 实例，并将根组件渲染到原生节点
   * @param rootComponent 根组件
   * @param host 原生节点
   */
  mount(rootComponent: ComponentInstance, host: NativeNode) {
    const rootComponentRef = this.get(RootComponentRef)

    rootComponentRef.component = rootComponent
    rootComponentRef.host = host
    this.get(History).listen()
    this.get(LifeCycle).init()
    this.get(Renderer).render()
    this.readyEvent.next()
    return this
  }

  /**
   * 销毁 TextBus 实例
   */
  destroy() {
    [History, LifeCycle].forEach(i => {
      this.get(i as Type<{ destroy(): void }>).destroy()
    })
  }
}
