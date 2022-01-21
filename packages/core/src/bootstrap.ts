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

export interface TextBusConfig {
  components: Component[]
  formatters: Formatter[]
  platformProviders: Provider[]
}

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
