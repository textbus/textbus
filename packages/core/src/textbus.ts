import { Injector, normalizeProvider, NullInjector, Provider, ReflectiveInjector, Scope } from '@viewfly/core'
import { Observable, Subject } from '@tanbo/stream'

import {
  AsyncComponentConstructor,
  Attribute,
  Component,
  ComponentConstructor,
  ComponentLiteral,
  Formatter
} from './model/_api'
import {
  ATTRIBUTE_LIST,
  Commander,
  COMPONENT_LIST,
  Controller,
  FocusManager,
  FORMATTER_LIST,
  History,
  HISTORY_STACK_SIZE,
  Keyboard,
  LocalHistory,
  NativeSelectionBridge,
  Query,
  READONLY,
  Registry,
  RootComponentRef,
  Scheduler,
  Selection, SelectionSnapshot,
  ZEN_CODING_DETECT,
  Adapter
} from './base/_api'
import { makeError } from './_utils/make-error'
import { __markerCache } from './help'

const textbusError = makeError('Textbus')

/**
 * Textbus 插件接口
 */
export interface Plugin {
  /**
   * 编辑器初始化时调用的勾子
   * @param textbus 访问 Textbus 内部实例的 IoC 容器
   */
  setup(textbus: Textbus): void

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
  components?: (ComponentConstructor | AsyncComponentConstructor)[]
  /** 格式列表 */
  formatters?: Formatter<any>[]
  /** 属性列表 */
  attributes?: Attribute<any>[]
  /** 跨平台及基础扩展实现的提供者 */
  providers?: Provider[]
  /** 插件集合 */
  plugins?: Plugin[]

  /**
   * 当模块注册时调用
   */
  beforeEach?(textbus: Textbus): void

  /**
   * 初始化时的设置，返回一个函数，当 Textbus 销毁时调用
   * @param textbus
   */
  setup?(textbus: Textbus): Promise<(() => void) | void> | (() => void) | void

  /**
   * 当启动完成时触发
   */
  onAfterStartup?(textbus: Textbus): void

  /**
   * 当 Textbus 销毁时触发
   */
  onDestroy?(textbus: Textbus): void
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
  /** 附加的渲染器。常用于在内存中渲染 HTML 字符串*/
  additionalAdapters?: Adapter<any, any, any>[]
}

/**
 * Textbus 内核启动器
 */
export class Textbus extends ReflectiveInjector {
  static diScope = new Scope('Textbus')

  /** 当编辑器初始化完成时触发 */
  onReady: Observable<void>
  /** 当视图获得焦点时触发 */
  onFocus: Observable<void>
  /** 当视图失去焦点时触发 */
  onBlur: Observable<void>
  /** 当编辑器内容变化时触发 */
  onChange: Observable<void>
  /** 当用户按 Ctrl + S 时触发 */
  onSave: Observable<void>

  /** 编辑器是否已销毁 */
  destroyed = false
  /** 编辑器是否已准备好 */
  isReady = false

  get readonly() {
    return this.controller.readonly
  }

  set readonly(b: boolean) {
    this.controller.readonly = b
  }

  get isFocus() {
    return this._isFocus
  }

  protected _isFocus = false

  private beforeDestroyCallbacks: Array<() => void> = []

  private plugins: Plugin[]

  private isDestroyed = false

  protected changeEvent = new Subject<void>()
  private controller: Controller
  private focusEvent = new Subject<void>()
  private blurEvent = new Subject<void>()
  private saveEvent = new Subject<void>()
  private readyEvent = new Subject<void>()
  private beforeSelection: SelectionSnapshot | null = null

  constructor(public config: TextbusConfig) {
    super(new NullInjector(), [], Textbus.diScope)
    const { plugins, providers } = this.mergeModules(config)
    this.plugins = plugins
    this.normalizedProviders = providers.map(i => normalizeProvider(i))

    this.onChange = this.changeEvent.asObservable()
    this.onFocus = this.focusEvent.asObservable()
    this.onBlur = this.blurEvent.asObservable()
    this.onSave = this.saveEvent.asObservable()
    this.onReady = this.readyEvent.asObservable()
    this.controller = this.get(Controller)

    config.imports?.forEach(module => {
      if (typeof module.beforeEach === 'function') {
        module.beforeEach(this)
      }
    })
    config.beforeEach?.(this)
  }

  /**
   * 启动一个 Textbus 实例，并将根组件渲染到原生节点
   * @param rootComponent 根组件
   */
  async render(rootComponent: Component): Promise<this> {
    if (this.isDestroyed) {
      throw textbusError('Textbus instance is destroyed!')
    }
    const rootComponentRef = this.get(RootComponentRef)
    rootComponentRef.component = rootComponent

    const callbacks: Array<(() => void) | Promise<(() => void) | void> | null> = []

    this.config.imports?.forEach(i => {
      if (typeof i.setup === 'function') {
        const callback = i.setup(this)
        callbacks.push(callback || null)
      }
    })
    callbacks.push(this.config.setup?.(this) || null)
    const fns = await Promise.all(callbacks)

    fns.forEach(i => {
      if (i) {
        this.beforeDestroyCallbacks.push(i)
      }
    })

    const scheduler = this.get(Scheduler)
    const history = this.get(History)
    const viewRenderer = this.get(Adapter)

    this.initDefaultShortcut()

    this.config.imports?.forEach(module => {
      module.onAfterStartup?.(this)
    })

    this.config.onAfterStartup?.(this)

    history.listen()
    scheduler.run()

    const subscription = scheduler.onDocChanged.subscribe(() => {
      this.changeEvent.next()
    })
    this.beforeDestroyCallbacks.push(() => {
      subscription.unsubscribe()
    })
    const focusManager = this.get(FocusManager, null)

    if (focusManager) {
      subscription.add(
        focusManager.onFocus.subscribe(() => {
          this.focusEvent.next()
        }),
        focusManager.onBlur.subscribe(() => {
          this.blurEvent.next()
        })
      )
    }
    const destroyView = viewRenderer.render(rootComponent, this)
    if (typeof destroyView === 'function') {
      this.beforeDestroyCallbacks.push(destroyView)
    }
    this.config.additionalAdapters?.forEach(adapter => {
      const fn = adapter.render(rootComponent, this)
      if (typeof fn === 'function') {
        this.beforeDestroyCallbacks.push(fn)
      }
    })
    this.plugins.forEach(i => i.setup(this))
    this.isReady = true
    this.readyEvent.next()
    this.readyEvent.complete()
    return this
  }

  /**
   * 获取焦点
   */
  focus() {
    this.guardReady()
    if (this.beforeSelection) {
      this.beforeSelection.restore(true)
      this.beforeSelection = null
      return
    }
    const selection = this.get(Selection)
    const rootComponentRef = this.get(RootComponentRef)
    if (selection.commonAncestorSlot) {
      selection.restore()
      return
    }
    selection.selectLastPosition(rootComponentRef.component, true)
  }

  /**
   * 取消编辑器焦点
   */
  blur() {
    if (this.isReady) {
      const selection = this.get(Selection)
      this.beforeSelection = selection.createSnapshot()
      selection.unSelect()
      selection.restore()
    }
  }

  /**
   * 获取 JSON 格式的内容
   */
  getJSON(): ComponentLiteral {
    this.guardReady()

    const rootComponentRef = this.get(RootComponentRef)
    return rootComponentRef.component.toJSON()
  }

  nextTick(task: () => void) {
    const scheduler = this.get(Scheduler)
    scheduler.addUpdatedTask(task)
  }

  /**
   * 销毁 Textbus 实例
   */
  destroy() {
    this.isDestroyed = true
    this.config.onDestroy?.(this)
    this.plugins.forEach(i => i.onDestroy?.())
    this.config.imports?.forEach(module => {
      module.onDestroy?.(this)
    })
    this.beforeDestroyCallbacks.forEach(i => {
      i()
    })

    const root = this.get(RootComponentRef)
    root.component.changeMarker.destroy(true)
    const instances = [this.get(History), this.get(Selection), this.get(Scheduler)]
    instances.forEach(i => {
      i.destroy()
    })

    this.recordValues.clear()
    this.normalizedProviders = []
    __markerCache.forEach(i => i.destroy())
    __markerCache.clear()
  }

  protected guardReady() {
    if (this.destroyed) {
      throw textbusError('the editor instance is destroyed!')
    }
    if (!this.isReady) {
      throw textbusError('please wait for the editor to initialize before getting the content!')
    }
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
      Query,
      Selection,
      Registry,
      {
        provide: Textbus,
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
          throw textbusError('You must implement the `NativeSelectionBridge` interface to start Textbus!')
        }
      }, {
        provide: Adapter,
        useFactory() {
          throw textbusError('You must implement the `ViewRenderer` interface to start Textbus!')
        }
      }
    ]
    return {
      providers,
      plugins
    }
  }

  private bindContext<T extends (Attribute<any> | Formatter<any>)>(
    list: Array<T | ((injector: Textbus) => T)> = []
  ): T[] {
    return list.map(item => {
      if (typeof item === 'function') {
        return item(this)
      }
      return item
    })
  }

  private initDefaultShortcut() {
    const selection = this.get(Selection)
    const keyboard = this.get(Keyboard)
    const history = this.get(History)
    const commander = this.get(Commander)
    keyboard.addShortcut({
      keymap: {
        key: 's',
        modKey: true
      },
      action: () => {
        this.saveEvent.next()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'Enter'
      },
      action: () => {
        commander.break()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: ['Delete', 'Backspace']
      },
      action: (key) => {
        commander.delete(key === 'Backspace')
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
      },
      action: (key) => {
        switch (key) {
          case 'ArrowLeft':
            selection.toPrevious()
            break
          case 'ArrowRight':
            selection.toNext()
            break
          case 'ArrowUp':
            selection.toPreviousLine()
            break
          case 'ArrowDown':
            selection.toNextLine()
            break
        }
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'],
        shiftKey: true
      },
      action: (key) => {
        switch (key) {
          case 'ArrowLeft':
            selection.wrapToBefore()
            break
          case 'ArrowRight':
            selection.wrapToAfter()
            break
          case 'ArrowUp':
            selection.wrapToPreviousLine()
            break
          case 'ArrowDown':
            selection.wrapToNextLine()
            break
        }
      }
    })

    keyboard.addShortcut({
      keymap: {
        key: 'Tab'
      },
      action: () => {
        commander.insert('    ')
      }
    })

    keyboard.addShortcut({
      keymap: {
        key: 'a',
        modKey: true
      },
      action: () => {
        selection.selectAll()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'c',
        modKey: true
      },
      action: () => {
        commander.copy()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'x',
        modKey: true
      },
      action: () => {
        commander.cut()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'z',
        modKey: true
      },
      action: () => {
        history.back()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'z',
        modKey: true,
        shiftKey: true
      },
      action: () => {
        history.forward()
      }
    })
    keyboard.addShortcut({
      keymap: {
        key: 'y',
        modKey: true,
      },
      action: () => {
        history.forward()
      }
    })
  }
}
