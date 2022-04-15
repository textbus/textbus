import { Inject, Injectable } from '@tanbo/di'
import { Component, Formatter } from '../model/_api'
import { COMPONENT_LIST, FORMATTER_LIST } from './_injection-tokens'

@Injectable()
export class Registry {
  private componentMap = new Map<string, Component>()
  private formatMap = new Map<string, Formatter>()

  constructor(@Inject(COMPONENT_LIST) private components: Component[],
              @Inject(FORMATTER_LIST) private formatters: Formatter[]) {
    components.forEach(f => {
      this.componentMap.set(f.name, f)
    })
    formatters.forEach(f => {
      this.formatMap.set(f.name, f)
    })
  }

  /**
   * 根据组件名获取组件
   * @param name 组件名
   */
  getComponent(name: string) {
    return this.componentMap.get(name)
  }

  /**
   * 根据格式名获取格式
   * @param name 格式名
   */
  getFormatter(name: string) {
    return this.formatMap.get(name)
  }
}
