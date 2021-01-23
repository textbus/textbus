import { Injectable, Injector, ReflectiveInjector, Type } from '@tanbo/di';

import { AbstractComponent, ComponentSetter, Interceptor } from './core/_api';

@Injectable()
export class ComponentInjectors {
  private injectors = new Map<Type<AbstractComponent>, Injector>();

  set(componentConstruct: Type<AbstractComponent>, injector: Injector) {
    this.injectors.set(componentConstruct, injector);
  }

  get(componentConstruct: Type<AbstractComponent>) {
    return this.injectors.get(componentConstruct) || new ReflectiveInjector(null, []);
  }

  destroy() {
    this.injectors.forEach(injector => {
      injector.get(Interceptor as Type<Interceptor<any>>).onDestroy?.();
      injector.get(ComponentSetter as Type<ComponentSetter<any>>).onDestroy?.();
    })
  }
}
