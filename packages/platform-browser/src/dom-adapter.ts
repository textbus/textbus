import {
  ComponentInstance,
  Slot,
  ViewAdapter,
  NodeLocation,
  VElement,
  VTextNode,
  createBidirectionalMapping
} from '@textbus/core'
import { createElement } from './_utils/uikit'
import { VIEW_DOCUMENT } from './injection-tokens'

/**
 * Textbus PC 端浏览器渲染能力实现
 */
export abstract class DomAdapter<ViewComponent, ViewElement> extends ViewAdapter<ViewElement> {
  host = createElement('div', {
    styles: {
      cursor: 'text',
      wordBreak: 'break-all',
      boxSizing: 'border-box',
      flex: 1,
      outline: 'none'
    },
    attrs: {
      'data-textbus-view': VIEW_DOCUMENT,
    },
    props: {
      id: 'textbus-' + Number((Math.random() + '').substring(2)).toString(16)
    }
  })

  protected componentRootElementCaches = new WeakMap<ComponentInstance, HTMLElement>()
  protected slotRootNativeElementCaches = createBidirectionalMapping<Slot, Node>(a => {
    return a instanceof Slot
  })
  protected slotRootVElementCaches = new WeakMap<Slot, VElement>()

  protected constructor(private mount: (host: HTMLElement, viewComponent: ViewComponent) => (void | (() => void))) {
    super()
  }

  render(rootComponent: ComponentInstance): void | (() => void) {
    const view = this.componentRender(rootComponent)
    return this.mount(this.host, view)
  }

  abstract componentRender(component: ComponentInstance): ViewComponent

  override copy() {
    document.execCommand('copy')
  }

  getNativeNodeByComponent(component: ComponentInstance): HTMLElement | null {
    return this.componentRootElementCaches.get(component) || null
  }

  getNativeNodeBySlot(slot: Slot): HTMLElement | null {
    return this.slotRootNativeElementCaches.get(slot) as HTMLElement || null
  }

  /**
   * 获取插槽内容节点集合
   * @param slot
   */
  getNodesBySlot(slot: Slot): Node[] {
    const rootNativeNode = this.getNativeNodeBySlot(slot)
    if (!rootNativeNode) {
      return []
    }
    const rootVNode = this.slotRootVElementCaches.get(slot)!
    const getNodes = (vElement: VElement, nativeNode: HTMLElement, result: Node[]) => {
      if (vElement.location) {
        result.push(nativeNode)
      }
      for (let i = 0; i < vElement.children.length; i++) {
        const vChild = vElement.children[i]
        const nativeChild = nativeNode.childNodes[i]
        if (vChild instanceof VElement) {
          getNodes(vChild, nativeChild as HTMLElement, result)
        } else if (vChild instanceof VTextNode) {
          result.push(nativeChild)
        } else {
          result.push(this.getNativeNodeByComponent(vChild)!)
        }
      }
      return result
    }

    return getNodes(rootVNode, rootNativeNode as HTMLElement, [])
  }

  /**
   * 获取原生节点的原始数据在文档中的位置
   * @param node
   */
  getLocationByNativeNode(node: Node): NodeLocation | null {
    let slotRootNode = node
    while (!this.slotRootNativeElementCaches.get(slotRootNode)) {
      slotRootNode = slotRootNode.parentNode as Node
      if (!slotRootNode) {
        return null
      }
    }
    const slot = this.slotRootNativeElementCaches.get(slotRootNode)
    const rootVNode = this.slotRootVElementCaches.get(slot)!

    const getLocation = (target: Node, tree: HTMLElement, vNodeTree: VElement) => {
      if (target === tree) {
        return { ...vNodeTree.location! }
      }
      const childNodes = tree.childNodes
      for (let i = 0; i < childNodes.length; i++) {
        const child = vNodeTree.children[i]
        const nativeChild = tree.childNodes[i]
        if (nativeChild === target) {
          if (child instanceof ComponentInstance) {
            const index = child.parent!.indexOf(child)
            return {
              slot: child.parent,
              startIndex: index,
              endIndex: index + 1
            }
          }
          return child.location
        } else if (child instanceof VElement) {
          let r: NodeLocation | null = null
          if (nativeChild.nodeType === Node.ELEMENT_NODE) {
            r = getLocation(target, nativeChild as HTMLElement, child)
          }
          if (r) {
            return r
          }
        }
      }
      return null
    }

    return getLocation(node, slotRootNode as HTMLElement, rootVNode)
  }
}
