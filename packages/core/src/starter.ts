import { Injector, NullInjector, Provider, ReflectiveInjector } from '@tanbo/di'
import { Observable, Subject, Subscription } from '@tanbo/stream'

import { ComponentInstance, Formatter, Component, invokeListener } from './model/_api'
import {
  NativeNode,
  History,
  RootComponentRef,
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
 * Textbus 核心配置
 */
export interface TextbusConfig {
  /** 组件列表 */
  components: Component[]
  /** 格式列表 */
  formatters: Formatter[]
  /** 跨平台及基础扩展实现的提供者 */
  providers: Provider[]
  /** 使用 contentEditable 作为编辑器控制可编辑范围 */
  useContentEditable?: boolean

  /**
   * 初始化之前的设置，返回一个函数，当 Textbus 销毁时调用
   * @param starter
   */
  setup?(starter: Starter): (() => unknown) | void
}

/**
 * Textbus 内核启动器
 */
export class Starter extends ReflectiveInjector {
  onReady: Observable<void>
  private readyEvent = new Subject<void>()

  private instanceList = new Set<ComponentInstance>()
  private subs: Subscription[] = []

  private beforeDestroy: (() => unknown) | void

  constructor(public config: TextbusConfig) {
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
          throw starterErrorFn('You must implement the `NativeSelectionBridge` interface to start Textbus!')
        }
      }, {
        provide: NativeRenderer,
        useFactory() {
          throw starterErrorFn('You must implement the `NativeRenderer` interface to start Textbus!')
        }
      }
    ])
    this.onReady = this.readyEvent.asObservable()
    this.beforeDestroy = config.setup?.(this)
  }

  /**
   * 启动一个 Textbus 实例，并将根组件渲染到原生节点
   * @param rootComponent 根组件
   * @param host 原生节点
   */
  mount(rootComponent: ComponentInstance, host: NativeNode) {
    const rootComponentRef = this.get(RootComponentRef)

    rootComponentRef.component = rootComponent
    rootComponentRef.host = host
    const renderer = this.get(Renderer)
    this.get(History).listen()
    this.subs.push(
      rootComponent.changeMarker.onChildComponentRemoved.subscribe(instance => {
        this.instanceList.add(instance)
      }),
      renderer.onViewChecked.subscribe(() => {
        this.instanceList.forEach(instance => {
          let comp = instance
          while (comp) {
            const parent = comp.parent
            if (parent) {
              comp = parent.parent as ComponentInstance
            } else {
              break
            }
          }
          if (comp !== rootComponent) {
            Starter.invokeChildComponentDestroyHook(comp)
          }
        })
        this.instanceList.clear()
      })
    )
    renderer.render()
    this.readyEvent.next()
    return this
  }

  /**
   * 销毁 Textbus 实例
   */
  destroy() {
    const beforeDestroy = this.beforeDestroy
    if (typeof beforeDestroy === 'function') {
      beforeDestroy()
    }
    [History].forEach(i => {
      this.get(i).destroy()
    })
    this.subs.forEach(i => i.unsubscribe())
  }

  private static invokeChildComponentDestroyHook(parent: ComponentInstance) {
    parent.slots.toArray().forEach(slot => {
      slot.sliceContent().forEach(i => {
        if (typeof i !== 'string') {
          Starter.invokeChildComponentDestroyHook(i)
        }
      })
    })
    invokeListener(parent, 'onDestroy')
  }
}
