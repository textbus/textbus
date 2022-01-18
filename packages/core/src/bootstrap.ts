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
  TBSelection, Translator
} from './foundation/_api'
import { Starter } from './starter'

export interface TextBusConfig {
  components: Component[]
  formatters: Formatter[]
}

export function bootstrap(config: TextBusConfig) {
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
    TBSelection,
    Translator,
    ...staticProviders
  ]

  function loadPlatformProviders(provideFn: () => Provider[]): Promise<Starter> {
    const platformProviders = provideFn()
    const rootInjector = new Starter([
      ...providers,
      ...platformProviders,
      {
        provide: Injector,
        useFactory() {
          return rootInjector
        }
      }
    ])
    return Promise.resolve(rootInjector)
  }

  return {
    loadPlatformProviders
  }
}
