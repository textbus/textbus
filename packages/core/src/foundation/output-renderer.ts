import { Injectable } from '@tanbo/di'

import {
  VElement,
  VTextNode,
  FormatItem,
  FormatTree,
  ComponentInstance,
  Slot,
} from '../model/_api'
import { formatSort } from './renderer'
import { RootComponentRef } from './_injection-tokens'

/**
 * Textbus 输出渲染器
 */
@Injectable()
export class OutputRenderer {
  private componentVNode = new WeakMap<ComponentInstance, VElement>()

  private slotVNodeCaches = new WeakMap<Slot, VElement>()

  private slotRenderFactory = new WeakMap<Slot, () => VElement>()

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
      const node = component.methods.render(true, (slot, factory) => {
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

  private slotRender(slot: Slot, slotRenderFactory: () => VElement): VElement {
    if (slot.changeMarker.outputDirty) {
      this.slotRenderFactory.set(slot, slotRenderFactory)
      const root = slotRenderFactory()
      let host = root
      const formatTree = slot.createFormatTree()
      if (formatTree.formats) {
        host = this.createVDomByOverlapFormats(formatSort(formatTree.formats), root, slot)
      }
      if (formatTree.children) {
        const children = this.createVDomByFormatTree(slot, formatTree.children)
        host.appendChild(...children)
      } else {
        host.appendChild(...this.createVDomByContent(slot, formatTree.startIndex, formatTree.endIndex))
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

  private createVDomByFormatTree(slot: Slot, formats: FormatTree[]) {
    const children: Array<VElement | VTextNode> = []
    formats.forEach(child => {
      if (child.formats) {
        const elements: VElement[] = []
        const formats = formatSort(child.formats)
        let host: VElement = null as any
        formats.forEach(item => {
          const node = item.formatter.render(host, item.value, true)
          if (node && host !== node) {
            elements.push(node)
            host = node
          }
        })

        const node = elements.shift()
        let parent = node!
        if (node) {
          while (elements.length) {
            const c = elements.shift()!
            parent.appendChild(c)
            parent = c
          }
          children.push(node)
          if (child.children) {
            const c = this.createVDomByFormatTree(slot, child.children)
            host.appendChild(...c)
          } else {
            host.appendChild(...this.createVDomByContent(slot, child.startIndex, child.endIndex))
          }
        } else {
          children.push(...this.createVDomByFormatTree(slot, child.children || []))
        }
      } else {
        children.push(...this.createVDomByContent(slot, child.startIndex, child.endIndex))
      }
    })
    return children
  }

  private createVDomByOverlapFormats(formats: FormatItem[], host: VElement, slot: Slot): VElement {
    const item = formats.shift()
    if (item) {
      const next = item.formatter.render(host, item.value, true)
      if (next && next !== host) {
        host.appendChild(next)
        host = next
      }
      return this.createVDomByOverlapFormats(formats, host, slot)
    }
    return host
  }

  private createVDomByContent(slot: Slot, startIndex: number, endIndex: number): Array<VTextNode | VElement> {
    const elements: Array<string | ComponentInstance> = slot.sliceContent(startIndex, endIndex).map(i => {
      if (typeof i === 'string') {
        return i.match(/[\n]|[^\n]+/g)!
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
