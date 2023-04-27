import { Injector, normalizeProvider, NullInjector, Provider, ReflectiveInjector, Scope } from '@tanbo/di'

import { ComponentInstance, Formatter, Component, NativeNode, Attribute } from './model/_api'
import {
  History,
  RootComponentRef,
  Renderer,
  COMPONENT_LIST,
  FORMATTER_LIST,
  Commander,
  Keyboard,
  OutputRenderer,
  Query,
  Selection,
  NativeSelectionBridge,
  NativeRenderer,
  Controller,
  LocalHistory,
  ZEN_CODING_DETECT,
  Scheduler,
  HISTORY_STACK_SIZE,
  READONLY,
  Registry,
  ATTRIBUTE_LIST,
  PureRenderer
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

/**
 * Textbus 模块配置
 */
export interface Module {
  /** 组件列表 */
  components?: Component[]
  /** 格式列表 */
  formatters?: (Formatter<any> | ((injector: Injector) => Formatter<any>))[]
  /** 属性列表 */
  attributes?: (Attribute<any> | ((injector: Injector) => Attribute<any>))[]
  /** 跨平台及基础扩展实现的提供者 */
  providers?: Provider[]
  /** 插件集合 */
  plugins?: Array<Plugin | (() => Plugin)>

  /**
   * 初始化之前的设置，返回一个函数，当 Textbus 销毁时调用
   * @param starter
   */
  setup?(starter: Starter): Promise<(() => void) | void> | (() => void) | void
}

/**
 * Textbus 核心配置
 */
export interface TextbusConfig extends Module {
  /** 导入第三方包 */
  imports?: Module[]
  /** 开启 Zen Coding 支持 */
  zenCoding?: boolean
  /** 最大历史记录栈 */
  historyStackSize?: number
  /** 是否只读 */
  readonly?: boolean
}

/**
 * Textbus 内核启动器
 */
export class Starter extends ReflectiveInjector {
  static diScope = new Scope('Textbus')
  private beforeDestroyCallbacks: Array<() => void> = []

  private plugins: Plugin[]

  private isDestroyed = false

  constructor(public config: TextbusConfig) {
    super(new NullInjector(), [], Starter.diScope)
    const { plugins, providers } = this.mergeModules(config)
    this.plugins = plugins
    this.staticProviders = providers
    this.normalizedProviders = this.staticProviders.map(i => normalizeProvider(i))
  }

  /**
   * 启动一个 Textbus 实例，并将根组件渲染到原生节点
   * @param host 原生节点
   * @param rootComponent 根组件
   */
  async mount(host: NativeNode, rootComponent: ComponentInstance): Promise<this> {
    const rootComponentRef = this.get(RootComponentRef)
    rootComponentRef.component = rootComponent
    rootComponentRef.host = host

    const callbacks: Array<(() => void) | Promise<(() => void) | void> | null> = []

    this.config.imports?.forEach(i => {
      if (typeof i.setup === 'function') {
        const callback = i.setup(this)
        callbacks.push(callback || null)
      }
    })
    callbacks.push(this.config.setup?.(this) || null)
    const fns = await Promise.all(callbacks)

    if (this.isDestroyed) {
      return this
    }

    fns.forEach(i => {
      if (i) {
        this.beforeDestroyCallbacks.push(i)
      }
    })

    const scheduler = this.get(Scheduler)
    const history = this.get(History)

    history.listen()
    scheduler.run()

    this.plugins.forEach(i => i.setup(this))
    return this
  }

  /**
   * 销毁 Textbus 实例
   */
  destroy() {
    this.isDestroyed = true
    this.plugins.forEach(i => i.onDestroy?.())
    this.beforeDestroyCallbacks.forEach(i => {
      i()
    });
    [this.get(History), this.get(Selection), this.get(Scheduler), this.get(Renderer)].forEach(i => {
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
    const attributes = this.bindContext(config.attributes)
    const formatters = this.bindContext(config.formatters)
    const plugins = [
      ...(config.plugins || [])
    ]
    config.imports?.forEach(module => {
      customProviders.push(...(module.providers || []))
      components.push(...(module.components || []))
      attributes.push(...this.bindContext(module.attributes))
      formatters.push(...this.bindContext(module.formatters))
      plugins.push(...(module.plugins || []))
    })
    const providers: Provider[] = [
      ...customProviders,
      {
        provide: READONLY,
        useValue: !!config.readonly
      },
      {
        provide: HISTORY_STACK_SIZE,
        useValue: typeof config.historyStackSize === 'number' ? config.historyStackSize : 500
      },
      {
        provide: COMPONENT_LIST,
        useValue: components
      }, {
        provide: ATTRIBUTE_LIST,
        useValue: attributes
      }, {
        provide: FORMATTER_LIST,
        useValue: formatters
      }, {
        provide: ZEN_CODING_DETECT,
        useValue: config.zenCoding
      }, {
        provide: RootComponentRef,
        useValue: {}
      },
      {
        provide: History,
        useClass: LocalHistory
      },
      Controller,
      Scheduler,
      Commander,
      Keyboard,
      OutputRenderer,
      PureRenderer,
      Query,
      Renderer,
      Selection,
      Registry,
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
      plugins: plugins.map(i => {
        if (typeof i === 'function') {
          return i()
        }
        return i
      })
    }
  }

  private bindContext<T extends (Attribute<any> | Formatter<any>)>(
    list: Array<T | ((injector: Injector) => T)> = []
  ): T[] {
    return list.map(item => {
      if (typeof item === 'function') {
        return item(this)
      }
      return item
    })
  }
}
