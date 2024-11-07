import { NodeViewAdapter } from '@textbus/platform-node'
import { Injector, ReflectiveInjector } from '@viewfly/core'
import { Adapter, Component } from '@textbus/core'
import { DomAdapter } from '@textbus/platform-browser'
import { ViewflyAdapter } from './viewfly-adapter'

export class ViewflyVDomAdapter extends NodeViewAdapter {
  override render(rootComponent: Component, injector: Injector): void | (() => void) {
    const childInjector = new ReflectiveInjector(injector, [{
      provide: Adapter,
      useValue: this
    }, {
      provide: DomAdapter,
      useValue: this
    }, {
      provide: ViewflyAdapter,
      useValue: this
    }])
    return super.render(rootComponent, childInjector)
  }
}
