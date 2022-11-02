import { Injectable } from '@tanbo/di'

import {
  VElement,
  VTextNode,
  FormatItem,
  FormatTree,
  ComponentInstance,
  Slot, SlotRenderFactory, FormatHostBindingRender, jsx,
} from '../model/_api'
import { RootComponentRef } from './_injection-tokens'
// import { makeError } from '../_utils/make-error'

// const outputRendererErrorFn = makeError('OutputRenderer')

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
      const node = component.extends.render(true, (slot, factory) => {
        return this.slotRender(slot, factory)
      })
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

      let children = formatTree.children ?
        this.createVDomByFormatTree(slot, formatTree.children) :
        this.createVDomByContent(slot, formatTree.startIndex, formatTree.endIndex)

      if (formatTree.formats) {
        children = [this.createVDomByOverlapFormats(formatTree.formats, children)]
      }
      const root = slotRenderFactory(children)
      for (const [attribute, value] of slot.getAttributes()) {
        attribute.render(root, value, true)
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

  private createVDomByFormatTree(slot: Slot, formats: FormatTree<any>[]) {
    const nodes: Array<VElement | VTextNode> = []
    for (const child of formats) {
      if (child.formats?.length) {
        const children = child.children ?
          this.createVDomByFormatTree(slot, child.children) :
          this.createVDomByContent(slot, child.startIndex, child.endIndex)

        const nextChildren = this.createVDomByOverlapFormats(
          child.formats,
          children
        )
        nodes.push(nextChildren)
      } else {
        nodes.push(...this.createVDomByContent(slot, child.startIndex, child.endIndex))
      }
    }
    return nodes
  }

  private createVDomByOverlapFormats(
    formats: (FormatItem<any>)[],
    children: Array<VElement | VTextNode>): VElement {
    const hostBindings: Array<FormatHostBindingRender> = []
    let host: VElement | null = null
    for (let i = formats.length - 1; i > -1; i--) {
      const item = formats[i]
      const next = item.formatter.render(children, item.value, true)
      if (!(next instanceof VElement)) {
        hostBindings.push(next)
        continue
      }
      host = next
      children = [next]
    }
    for (const binding of hostBindings) {
      if (!host) {
        host = jsx(binding.fallbackTagName)
        host.appendChild(...children)
      }
      binding.attach(host)
    }
    return host!
  }

  private createVDomByContent(slot: Slot, startIndex: number, endIndex: number): Array<VTextNode | VElement> {
    const elements: Array<string | ComponentInstance> = slot.sliceContent(startIndex, endIndex).map(i => {
      if (typeof i === 'string') {
        return i.match(/\n|[^\n]+/g)!
      }
      return i
    }).flat()
    return elements.map(item => {
      let vNode!: VElement | VTextNode
      let length: number
      if (typeof item === 'string') {
        if (item === '\n') {
          vNode = new VElement('br')
          length = 1
        } else {
          vNode = new VTextNode(item)
          length = item.length
        }
      } else {
        length = 1
        vNode = this.componentRender(item)
      }
      startIndex += length
      return vNode
    })
  }
}
