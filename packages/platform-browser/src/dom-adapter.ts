import {
  Component,
  Slot,
  ViewAdapter,
  NodeLocation,
  VElement,
  VTextNode,
  createBidirectionalMapping,
  Textbus
} from '@textbus/core'
import { createElement } from './_utils/uikit'
import { VIEW_DOCUMENT } from './injection-tokens'

/**
 * Textbus PC 端浏览器渲染能力桥接器抽象类，提供了 DOM 元素查询能力，具体渲染能力由各前端框架实现相应桥接
 */
export abstract class DomAdapter<ViewComponent, ViewElement> extends ViewAdapter {
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

  protected componentRootElementCaches = createBidirectionalMapping<Component, HTMLElement>(a => {
    return a instanceof Component
  })
  protected slotRootNativeElementCaches = createBidirectionalMapping<Slot, HTMLElement>(a => {
    return a instanceof Slot
  })
  protected slotRootVElementCaches = new WeakMap<Slot, VElement>()

  protected constructor(private mount: (host: HTMLElement, viewComponent: ViewComponent, textbus: Textbus) => (void | (() => void))) {
    super()
  }

  render(rootComponent: Component, textbus: Textbus): void | (() => void) {
    const view = this.componentRender(rootComponent)
    return this.mount(this.host, view, textbus)
  }

  abstract componentRender(component: Component): ViewComponent

  abstract slotRender(slot: Slot,
                      slotHostRender: (children: Array<VElement | VTextNode | Component>) => VElement,
                      renderEnv: any): ViewElement

  override copy() {
    document.execCommand('copy')
  }

  /**
   * 根据组件获取组件的根 DOM 节点
   * @param component
   */
  getNativeNodeByComponent(component: Component): HTMLElement | null {
    return this.componentRootElementCaches.get(component) || null
  }

  /**
   * 根据 DOM 节点，获对对应的组件根节点，如传入的 DOM 节点不为组件的根节点，则返回 null
   * @param node
   */
  getComponentByNativeNode(node: HTMLElement): Component | null {
    return this.componentRootElementCaches.get(node) || null
  }

  /**
   * 根据插槽获取插槽的根 DOM 节点
   * @param slot
   */
  getNativeNodeBySlot(slot: Slot): HTMLElement | null {
    return this.slotRootNativeElementCaches.get(slot) || null
  }

  /**
   * 根据 DOM 节点，获对对应的插槽根节点，如传入的 DOM 节点不为插槽的根节点，则返回 null
   * @param node
   */
  getSlotByNativeNode(node: HTMLElement): Slot | null {
    return this.slotRootNativeElementCaches.get(node) || null
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
    return getNodes(this, rootVNode, rootNativeNode as HTMLElement, [])
  }

  /**
   * 获取原生节点的原始数据在文档中的位置
   * @param node
   */
  getLocationByNativeNode(node: Node): NodeLocation | null {
    let slotRootNode = node
    while (!this.slotRootNativeElementCaches.get(slotRootNode as HTMLElement)) {
      slotRootNode = slotRootNode.parentNode as Node
      if (!slotRootNode) {
        return null
      }
    }
    const slot = this.slotRootNativeElementCaches.get(slotRootNode as HTMLElement)
    const rootVNode = this.slotRootVElementCaches.get(slot)!
    return getLocation(node, slotRootNode as HTMLElement, rootVNode)
  }
}

function getNodes(adapter: DomAdapter<any, any>, vElement: VElement, nativeNode: HTMLElement, result: Node[]) {
  if (vElement.location) {
    result.push(nativeNode)
  }
  for (let i = 0; i < vElement.children.length; i++) {
    const vChild = vElement.children[i]
    const nativeChild = nativeNode.childNodes[i]
    if (vChild instanceof VElement) {
      getNodes(adapter, vChild, nativeChild as HTMLElement, result)
    } else if (vChild instanceof VTextNode) {
      result.push(nativeChild)
    } else {
      result.push(adapter.getNativeNodeByComponent(vChild)!)
    }
  }
  return result
}

function getLocation(target: Node, tree: HTMLElement, vNodeTree: VElement) {
  if (target === tree) {
    return { ...vNodeTree.location! }
  }
  const childNodes = tree.childNodes
  for (let i = 0; i < childNodes.length; i++) {
    const child = vNodeTree.children[i]
    const nativeChild = tree.childNodes[i]
    if (nativeChild === target) {
      if (child instanceof Component) {
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
