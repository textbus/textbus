import { Injectable } from '@tanbo/di'

import { Renderer } from './renderer'
import { RootComponentRef } from './_injection-tokens'
import { ComponentInstance } from '../model/component'
import { invokeListener } from '../define-component'
import { Subscription } from '@tanbo/stream'

@Injectable()
export class LifeCycle {
  private instanceList = new Set<ComponentInstance>()

  private subs: Subscription[] = []

  constructor(private renderer: Renderer,
              private root: RootComponentRef) {
  }

  init() {
    this.subs.push(
      this.root.component.changeMarker.onChildComponentRemoved.subscribe(instance => {
        this.instanceList.add(instance)
      }),
      this.renderer.onViewChecked.subscribe(() => {
        this.instanceList.forEach(instance => {
          let comp = instance
          while (comp) {
            const parent = comp.parent
            if (parent) {
              comp = parent.parent as ComponentInstance
            } else {
              break
            }
          }
          if (comp !== this.root.component) {
            invokeListener(instance, 'onDestroy')
          }
        })
        this.instanceList.clear()
      })
    )
  }

  destroy() {
    this.subs.forEach(i => i.unsubscribe())
  }
}
