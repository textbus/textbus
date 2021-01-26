import { Injectable, InjectFlags, Injector, ReflectiveInjector, Type } from '@tanbo/di';

import { AbstractComponent, ComponentSetter, Interceptor } from './core/_api';

/**
 * 组件注入器
 */
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
      injector.get(Interceptor as Type<Interceptor<any>>, null, InjectFlags.Self)?.onDestroy?.();
      injector.get(ComponentSetter as Type<ComponentSetter<any>>, null, InjectFlags.Self)?.onDestroy?.();
    })
  }
}
