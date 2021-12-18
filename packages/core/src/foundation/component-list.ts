import { Inject, Injectable } from '@tanbo/di'
import { Component } from '../define-component'
import { COMPONENT_LIST } from './_injection-tokens'

@Injectable()
export class ComponentList {
  private componentMap = new Map<string, Component>()

  constructor(@Inject(COMPONENT_LIST) private components: Component[]) {
    components.forEach(f => {
      this.componentMap.set(f.name, f)
    })
  }

  get(key: string) {
    return this.componentMap.get(key)
  }
}
