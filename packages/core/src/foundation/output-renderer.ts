import { Injectable } from '@tanbo/di'

import { ComponentInstance, RenderMode, Slot, SlotRenderFactory, VElement } from '../model/_api'
import { RootComponentRef } from './_injection-tokens'
import { PureRenderer } from './pure-renderer'

/**
 * Textbus 输出渲染器
 */
@Injectable()
export class OutputRenderer {
  private componentVNode = new WeakMap<ComponentInstance, VElement>()

  private slotVNodeCaches = new WeakMap<Slot, VElement>()

  private slotRenderFactory = new WeakMap<Slot, SlotRenderFactory>()

  constructor(private rootComponentRef: RootComponentRef) {
  }

  /**
   * 以输出模式渲染当前文档
   */
  render() {
    const root = this.componentRender(this.rootComponentRef.component)
    new VElement('body', null, [root])
    return root
  }

  private componentRender(component: ComponentInstance): VElement {
    if (component.changeMarker.outputDirty) {
      const node = component.extends.render((slot, factory) => {
        return this.slotRender(slot, factory)
      }, RenderMode.Output)
      component.changeMarker.outputRendered()
      this.componentVNode.set(component, node)
      return node
    }
    const oldComponentVNode = this.componentVNode.get(component)
    component.slots.toArray().forEach(slot => {
      if (!slot.changeMarker.outputChanged) {
        return
      }
      const dirty = slot.changeMarker.outputDirty
      const oldVNode = this.slotVNodeCaches.get(slot)!
      const factory = this.slotRenderFactory.get(slot)!
      const vNode = this.slotRender(slot, factory)
      if (dirty) {
        if (oldComponentVNode === oldVNode) {
          this.componentVNode.set(component, vNode)
        }
        (oldVNode.parentNode as VElement).replaceChild(vNode, oldVNode)
        this.slotVNodeCaches.set(slot, vNode)
      }
    })
    component.changeMarker.outputRendered()
    return this.componentVNode.get(component)!
  }

  private slotRender(slot: Slot, slotRenderFactory: SlotRenderFactory): VElement {
    if (slot.changeMarker.outputDirty) {
      this.slotRenderFactory.set(slot, slotRenderFactory)
      const formatTree = slot.createFormatTree()
      const componentRender = (component) => {
        return this.componentRender(component)
      }
      let children = formatTree.children ?
        PureRenderer.createVDomByFormatTree(slot, formatTree.children, RenderMode.Output, componentRender) :
        PureRenderer.createVDomByContent(slot, formatTree.startIndex, formatTree.endIndex, RenderMode.Output, componentRender)

      if (formatTree.formats) {
        children = [PureRenderer.createVDomByOverlapFormats(formatTree.formats, children, slot, RenderMode.Output)]
      }
      const root = slotRenderFactory(children)
      for (const [attribute, value] of slot.getAttributes()) {
        attribute.render(root, value, RenderMode.Output)
      }
      slot.changeMarker.outputRendered()
      this.slotVNodeCaches.set(slot, root)
      return root
    }
    slot.sliceContent().filter((i): i is ComponentInstance => {
      return typeof i !== 'string'
    }).forEach(component => {
      if (!component.changeMarker.outputChanged) {
        return
      }
      const dirty = component.changeMarker.outputDirty
      const oldVNode = this.componentVNode.get(component)!
      const vNode = this.componentRender(component)
      if (dirty) {
        (oldVNode.parentNode as VElement).replaceChild(vNode, oldVNode)
      }
    })
    slot.changeMarker.outputRendered()
    return this.slotVNodeCaches.get(slot)!
  }
}
