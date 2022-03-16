import { Injectable } from '@tanbo/di'
import { Subscription } from '@tanbo/stream'

import { Renderer } from './renderer'
import { RootComponentRef } from './_injection-tokens'
import { ComponentInstance, invokeListener } from '../model/component'

/**
 * 组件销毁生合周期管理
 */
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
            this.invokeChildComponentDestroyHook(comp)
          }
        })
        this.instanceList.clear()
      })
    )
  }

  destroy() {
    this.subs.forEach(i => i.unsubscribe())
  }

  private invokeChildComponentDestroyHook(parent: ComponentInstance) {
    parent.slots.toArray().forEach(slot => {
      slot.sliceContent().forEach(i => {
        if (typeof i !== 'string') {
          this.invokeChildComponentDestroyHook(i)
        }
      })
    })
    invokeListener(parent, 'onDestroy')
  }
}
