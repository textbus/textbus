import { Injector, Provider } from '@tanbo/di'
import { Component } from './define-component'
import { Formatter } from './model/formatter'
import {
  Commander, COMPONENT_LIST, ComponentList, FORMATTER_LIST, FormatterList,
  History,
  Keyboard,
  LifeCycle,
  OutputRenderer,
  Query,
  Renderer, RootComponentRef,
  Selection, Translator
} from './foundation/_api'
import { Starter } from './starter'

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
}

/**
 * TextBus 核心启动函数
 * @param config
 */
export function bootstrap(config: TextBusConfig): Promise<Starter> {
  const staticProviders: Provider[] = [{
    provide: COMPONENT_LIST,
    useValue: config.components
  }, {
    provide: FORMATTER_LIST,
    useValue: config.formatters
  }, {
    provide: RootComponentRef,
    useValue: {}
  }]
  const providers: Provider[] = [
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
    ...staticProviders,
    ...config.platformProviders
  ]

  const rootInjector = new Starter([
    ...providers,
    {
      provide: Injector,
      useFactory() {
        return rootInjector
      }
    }
  ])
  return Promise.resolve(rootInjector)
}
