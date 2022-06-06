import { Injector, normalizeProvider, NullInjector, Provider, ReflectiveInjector } from '@tanbo/di'
import { Subject } from '@tanbo/stream'

import { ComponentInstance, Formatter, Component } from './model/_api'
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
  CoreHistory, MARKDOWN_DETECT, Scheduler
} from './foundation/_api'
import { makeError } from './_utils/make-error'

const starterErrorFn = makeError('Starter')

/**
 * Textbus 插件接口
 */
export interface Plugin {
  /**
   * 编辑器初始化时调用的勾子
   * @param injector 访问 Textbus 内部实例的 IoC 容器
   */
  setup(injector: Injector): void

  /**
   * 当编辑器销毁时调用
   */
  onDestroy?(): void
}

export interface Module {
  /** 组件列表 */
  components?: Component[]
  /** 格式列表 */
  formatters?: Formatter[]
  /** 跨平台及基础扩展实现的提供者 */
  providers?: Provider[]
  /** 插件集合 */
  plugins?: Array<() => Plugin>
}

/**
 * Textbus 核心配置
 */
export interface TextbusConfig extends Module {
  /** 导入第三方包 */
  imports?: Module[]
  /** 使用 contentEditable 作为编辑器控制可编辑范围 */
  useContentEditable?: boolean
  /** 开启 markdown 支持 */
  markdownDetect?: boolean

  /**
   * 初始化之前的设置，返回一个函数，当 Textbus 销毁时调用
   * @param starter
   */
  setup?(starter: Starter): Promise<(() => unknown) | void> | (() => unknown) | void
}

/**
 * Textbus 内核启动器
 */
export class Starter extends ReflectiveInjector {
  private readyEvent = new Subject<void>()

  private beforeDestroy: (() => unknown) | null = null

  private plugins: Plugin[]

  constructor(public config: TextbusConfig) {
    super(new NullInjector(), [])
    const {plugins, providers} = this.mergeModules(config)
    this.plugins = plugins.map(i => i())
    this.staticProviders = providers
    this.normalizedProviders = this.staticProviders.map(i => normalizeProvider(i))
  }

  /**
   * 启动一个 Textbus 实例，并将根组件渲染到原生节点
   * @param rootComponent 根组件
   * @param host 原生节点
   */
  async mount(rootComponent: ComponentInstance, host: NativeNode) {
    const rootComponentRef = this.get(RootComponentRef)
    rootComponentRef.component = rootComponent
    rootComponentRef.host = host

    const callback = this.config.setup?.(this)
    if (callback instanceof Promise) {
      await callback.then(fn => {
        this.beforeDestroy = fn || null
      })
    } else {
      this.beforeDestroy = callback || null
    }
    const scheduler = this.get(Scheduler)
    const history = this.get(History)

    scheduler.run()
    history.listen()

    this.plugins.forEach(i => i.setup(this))
    this.readyEvent.next()
    return this
  }

  /**
   * 销毁 Textbus 实例
   */
  destroy() {
    const beforeDestroy = this.beforeDestroy
    this.plugins.forEach(i => i.onDestroy?.())
    if (typeof beforeDestroy === 'function') {
      beforeDestroy()
    }
    [this.get(History), this.get(Selection), this.get(Scheduler)].forEach(i => {
      i.destroy()
    })
  }

  private mergeModules(config: TextbusConfig) {
    const customProviders = [
      ...(config.providers || []),
    ]
    const components = [
      ...(config.components || [])
    ]
    const formatters = [
      ...(config.formatters || [])
    ]
    const plugins = [
      ...(config.plugins || [])
    ]
    config.imports?.forEach(module => {
      customProviders.push(...(module.providers || []))
      components.push(...(module.components || []))
      formatters.push(...(module.formatters || []))
      plugins.push(...(module.plugins || []))
    })
    const providers: Provider[] = [
      ...customProviders,
      {
        provide: COMPONENT_LIST,
        useValue: components
      }, {
        provide: FORMATTER_LIST,
        useValue: formatters
      }, {
        provide: MARKDOWN_DETECT,
        useValue: config.markdownDetect
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
      Scheduler,
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
    ]
    return {
      providers,
      plugins
    }
  }
}
