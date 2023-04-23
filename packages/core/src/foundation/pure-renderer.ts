import { Injectable } from '@tanbo/di'

import {
  ComponentInstance,
  FormatHostBindingRender,
  FormatItem,
  FormatTree,
  jsx,
  RenderMode,
  Slot,
  SlotRenderFactory,
  VElement,
  VTextNode
} from '../model/_api'

import { makeError } from '../_utils/make-error'

const pureRendererErrorFn = makeError('PureRenderer')

/**
 * 虚拟 DOM 节点在数据内的范围
 */
export interface VNodeLocation {
  startIndex: number
  endIndex: number
  slot: Slot
}

export interface ComponentRenderFn {
  (component: ComponentInstance, renderMode: RenderMode): VElement
}

@Injectable()
export class PureRenderer {
  componentRender(component: ComponentInstance, renderMode: RenderMode): VElement {
    return component.extends.render((slot, factory) => {
      return this.slotRender(slot, factory, renderMode)
    }, renderMode)
  }

  slotRender(slot: Slot, slotRenderFactory: SlotRenderFactory, renderMode: RenderMode): VElement {
    const formatTree = slot.createFormatTree()
    const componentRender = (component, renderMode) => {
      return this.componentRender(component, renderMode)
    }
    let children = formatTree.children ?
      PureRenderer.createVDomByFormatTree(slot, formatTree.children, renderMode, componentRender) :
      PureRenderer.createVDomByContent(slot, formatTree.startIndex, formatTree.endIndex, renderMode, componentRender)

    if (formatTree.formats) {
      children = [PureRenderer.createVDomByOverlapFormats(formatTree.formats, children, slot, renderMode)]
    }
    const root = slotRenderFactory(children)
    for (const [attribute, value] of slot.getAttributes()) {
      attribute.render(root, value, renderMode)
    }
    return root
  }

  static createVDomByFormatTree(
    slot: Slot,
    formats: FormatTree<any>[],
    renderMode: RenderMode,
    componentRender: ComponentRenderFn,
    setVNodeLocation?: (vNode: VElement | VTextNode, location: VNodeLocation) => void
  ) {
    const nodes: Array<VElement | VTextNode> = []
    for (const child of formats) {
      if (child.formats?.length) {
        const children = child.children ?
          PureRenderer.createVDomByFormatTree(slot, child.children, renderMode, componentRender, setVNodeLocation) :
          PureRenderer.createVDomByContent(slot, child.startIndex, child.endIndex, renderMode, componentRender, setVNodeLocation)

        const nextChildren = PureRenderer.createVDomByOverlapFormats(
          child.formats,
          children,
          slot,
          renderMode,
          setVNodeLocation
        )
        nodes.push(nextChildren)
      } else {
        nodes.push(...PureRenderer.createVDomByContent(
          slot,
          child.startIndex,
          child.endIndex,
          renderMode,
          componentRender,
          setVNodeLocation
        ))
      }
    }
    return nodes
  }

  static createVDomByOverlapFormats(
    formats: (FormatItem<any>)[],
    children: Array<VElement | VTextNode>,
    slot: Slot,
    renderMode: RenderMode,
    setVNodeLocation?: (vNode: VElement | VTextNode, location: VNodeLocation) => void): VElement {
    const hostBindings: Array<{ render: FormatHostBindingRender, item: FormatItem<any> }> = []
    let host: VElement | null = null
    for (let i = formats.length - 1; i > -1; i--) {
      const item = formats[i]
      const next = item.formatter.render(children, item.value, renderMode)
      if (!next) {
        throw pureRendererErrorFn(`Formatter \`${item.formatter.name}\` must return an VElement!`)
      }
      if (!(next instanceof VElement)) {
        hostBindings.push({
          item,
          render: next
        })
        continue
      }
      host = next
      setVNodeLocation?.(next, {
        slot,
        startIndex: item.startIndex,
        endIndex: item.endIndex
      })
      children = [next]
    }
    for (const binding of hostBindings) {
      const { render, item } = binding
      if (!host) {
        host = jsx(render.fallbackTagName)
        host.appendChild(...children)
        setVNodeLocation?.(host, {
          slot,
          startIndex: item.startIndex,
          endIndex: item.endIndex
        })
      }
      render.attach(host)
    }
    return host!
  }

  static createVDomByContent(
    slot: Slot,
    startIndex: number,
    endIndex: number,
    renderMode: RenderMode,
    componentRender: ComponentRenderFn,
    setVNodeLocation?: (vNode: VElement | VTextNode, location: VNodeLocation) => void): Array<VTextNode | VElement> {
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
        vNode = componentRender(item, renderMode)
      }
      setVNodeLocation?.(vNode, {
        slot,
        startIndex,
        endIndex: startIndex + length
      })
      startIndex += length
      return vNode
    })
  }
}
