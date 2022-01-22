import { NullInjector, Provider, ReflectiveInjector, Type } from '@tanbo/di'

import { ComponentInstance } from './model/component'
import { NativeNode, History, RootComponentRef, LifeCycle, Renderer } from './foundation/_api'

/**
 * TextBus 内核启动器
 */
export class Starter extends ReflectiveInjector {
  constructor(private providers: Provider[] = []) {
    super(new NullInjector(), providers)
  }

  /**
   * 启动一个 TextBus 实例，并将根组件渲染到原生节点
   * @param rootComponent 根组件
   * @param host 原生节点
   */
  mount(rootComponent: ComponentInstance, host: NativeNode) {
    const rootComponentRef = this.get(RootComponentRef as Type<RootComponentRef>)

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
