import { Injector, NullInjector, Provider, ReflectiveInjector, Type } from '@tanbo/di'

import { ComponentInstance, Formatter } from './model/_api'
import {
  NativeNode,
  History,
  RootComponentRef,
  LifeCycle,
  Renderer,
  COMPONENT_LIST,
  FORMATTER_LIST,
  Commander,
  ComponentList,
  FormatterList,
  Keyboard,
  OutputRenderer,
  Query,
  Selection,
  Translator,
  NativeSelectionBridge,
  NativeRenderer, USE_CONTENT_EDITABLE
} from './foundation/_api'
import { Component } from './define-component'
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
  /** 跨平台实现的提供者 */
  platformProviders: Provider[]
  /** 使用 contentEditable 作为编辑器控制可编辑范围 */
  useContentEditable?: boolean
}

/**
 * TextBus 内核启动器
 */
export class Starter extends ReflectiveInjector {
  constructor(public config: TextBusConfig) {
    super(new NullInjector(), [
      ...config.platformProviders,
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
      Commander,
      ComponentList,
      FormatterList,
      History,
      Keyboard,
      LifeCycle,
      OutputRenderer,
      Query,
      Renderer,
      Selection,
      Translator,
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
