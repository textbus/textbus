import { NullInjector, Provider, ReflectiveInjector, Type } from '@tanbo/di'

import { ComponentInstance } from './model/component'
import { NativeNode, History, RootComponentRef, LifeCycle, Renderer } from './foundation/_api'

export class Starter extends ReflectiveInjector {
  constructor(private providers: Provider[] = []) {
    super(new NullInjector(), providers)
  }

  mount(rootComponent: ComponentInstance, host: NativeNode) {
    const rootComponentRef = this.get(RootComponentRef as Type<RootComponentRef>)

    rootComponentRef.component = rootComponent
    rootComponentRef.host = host
    this.get(History).listen()
    this.get(LifeCycle).init()
    this.get(Renderer).render()
  }

  destroy() {
    [History, LifeCycle].forEach(i => {
      this.get(i as Type<{ destroy(): void }>).destroy()
    })
  }
}
