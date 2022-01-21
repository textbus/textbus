import { Inject, Injectable } from '@tanbo/di'
import { Component } from '../define-component'
import { COMPONENT_LIST } from './_injection-tokens'

/**
 * 组件列表缓存
 */
@Injectable()
export class ComponentList {
  private componentMap = new Map<string, Component>()

  constructor(@Inject(COMPONENT_LIST) private components: Component[]) {
    components.forEach(f => {
      this.componentMap.set(f.name, f)
    })
  }

  /**
   * 根据组件名获取组件
   * @param key 组件名
   */
  get(key: string) {
    return this.componentMap.get(key)
  }
}
