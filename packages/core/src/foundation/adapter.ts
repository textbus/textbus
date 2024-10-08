import { Observable } from '@tanbo/stream'
import { Injector } from '@viewfly/core'

import { Component, invokeListener } from '../model/component'
import { Slot } from '../model/slot'
import { NodeLocation, VElement, VTextNode } from '../model/element'
import { createBidirectionalMapping, replaceEmpty } from '../_utils/tools'

export interface ViewMount<ViewComponent, NativeElement> {
  (host: NativeElement, viewComponent: ViewComponent, injector: Injector): (void | (() => void))
}

export interface Renderer<ViewComponent, ViewElement, NativeElement, NativeTextNode> {
  componentRender(component: Component<any>): ViewComponent

  vElementToViewElement(vEle: VElement, children: Array<ViewElement | string>): ViewElement

  getAndUpdateSlotRootNativeElement(vEle: VElement, update: (nativeElement: NativeElement | null) => void): void

  createCompositionNode(
    compositionState: CompositionState,
    updateNativeCompositionNode: (nativeNode: NativeElement | null) => void
  ): VElement

  getChildByIndex(parentElement: NativeElement, index: number): NativeElement | NativeTextNode

  getParentNode(node: NativeElement | NativeTextNode): NativeElement | null

  getChildNodes(parentElement: NativeElement): Array<NativeElement | NativeTextNode>

  isNativeElementNode(node: NativeElement | NativeTextNode): node is NativeElement
}

export interface CompositionState {
  slot: Slot
  text: string
  offset: number
  index: number
}

/**
 * Textbus 渲染适配器
 */
export abstract class Adapter<
  NativeElement extends object = object,
  NativeTextNode extends object = object,
  ViewComponent extends object = object,
  ViewElement extends object = object
> {
  composition: CompositionState | null = null
  /** 当视图更新时触发事件的可观察对象，用于通知 Textbus 视图渲染已完成 */
  abstract onViewUpdated: Observable<void>
  abstract host: NativeElement

  protected firstRending = true

  protected slotRootVElementCaches = new WeakMap<Slot, VElement>()
  protected slotRootNativeElementCaches = createBidirectionalMapping<Slot, NativeElement>(a => {
    return a instanceof Slot
  })
  protected componentRootElementCaches = createBidirectionalMapping<Component, NativeElement>(a => {
    return a instanceof Component
  })

  compositionNode: any = null

  protected constructor(private adapter: Renderer<ViewComponent, ViewElement, NativeElement, NativeTextNode>,
                        private mount: ViewMount<ViewComponent, NativeElement>) {
  }

  /** 根组件渲染方法 */
  render(rootComponent: Component, injector: Injector): void | (() => void) {
    const view = this.componentRender(rootComponent)
    this.firstRending = false
    return this.mount(this.host, view, injector)
  }

  componentRender(component: Component<any>): ViewComponent {
    return this.adapter.componentRender(component)
  }

  slotRender(slot: Slot,
             slotHostRender: (children: Array<VElement | VTextNode | Component>) => VElement,
             renderEnv?: any): ViewElement {
    const vElement = slot.toTree(slotHostRender, renderEnv)
    this.slotRootVElementCaches.set(slot, vElement)

    const vNodeToJSX = (vNode: VElement) => {
      const children: any[] = []
      const composition = this.composition
      if (composition && composition.slot === slot) {
        this.insertCompositionByIndex(slot, vNode, composition, () => {
          return this.adapter.createCompositionNode(composition, (compositionNode: any) => {
            this.compositionNode = compositionNode
          })
        })
      }
      for (let i = 0; i < vNode.children.length; i++) {
        const child = vNode.children[i]
        if (child instanceof VElement) {
          children.push(vNodeToJSX(child))
        } else if (child instanceof VTextNode) {
          children.push(replaceEmpty(child.textContent))
        } else {
          children.push(this.componentRender(child))
          if (!this.firstRending) {
            invokeListener(child, 'onParentSlotUpdated')
          }
        }
      }
      return this.adapter.vElementToViewElement(vNode, children)
    }
    this.adapter.getAndUpdateSlotRootNativeElement(vElement, nativeElement => {
      if (nativeElement) {
        this.slotRootNativeElementCaches.set(slot, nativeElement)
      } else {
        this.slotRootNativeElementCaches.remove(slot)
      }
    })
    const jsxNode = vNodeToJSX(vElement)
    slot.__changeMarker__.rendered()
    return jsxNode
  }

  protected insertCompositionByIndex(slot: Slot,
                                     vNode: VElement,
                                     composition: CompositionState,
                                     createCompositionNode: (composition: CompositionState) => VElement) {
    const location = vNode.location
    const nodes = vNode.children

    if (location && location.slot === composition.slot) {
      for (let i = 0; i < nodes.length; i++) {
        const child = nodes[i]
        if (child instanceof VTextNode) {
          const childLocation = child.location
          if (childLocation) {
            if (composition.index > childLocation.startIndex && composition.index <= childLocation.endIndex) {
              const compositionVNode = createCompositionNode(composition)
              if (composition.index === childLocation.endIndex) {
                nodes.splice(i + 1, 0, compositionVNode)
                break
              }
              const splitIndex = composition.index - childLocation.startIndex
              const beforeNode = new VTextNode(child.textContent.slice(0, splitIndex))
              beforeNode.location = {
                slot: childLocation.slot,
                startIndex: childLocation.startIndex,
                endIndex: childLocation.startIndex + splitIndex
              }

              const afterNode = new VTextNode(child.textContent.slice(splitIndex))
              afterNode.location = {
                slot: childLocation.slot,
                startIndex: composition.index,
                endIndex: childLocation.endIndex
              }
              nodes.splice(i, 1, beforeNode, compositionVNode, afterNode)
              break
            } else if (composition.index === 0 && childLocation.startIndex === 0) {
              nodes.splice(i, 0, createCompositionNode(composition))
              break
            }
          }
        } else if (child instanceof Component) {
          const componentIndex = slot.indexOf(child)
          if (composition.index === componentIndex + 1) {
            nodes.splice(i + 1, 0, createCompositionNode(composition))
            break
          } else if (componentIndex === 0 && composition.index === 0) {
            nodes.splice(i, 0, createCompositionNode(composition))
            break
          }
        } else if (child.tagName === 'br') {
          const location = child.location
          if (location) {
            if (location.endIndex === composition.index) {
              nodes.splice(i + 1, 0, createCompositionNode(composition))
              break
            } else if (location.startIndex === 0 && composition.index === 0) {
              nodes.splice(i, 0, createCompositionNode(composition))
              break
            }
          }
        }
      }
    }
  }

  /**
   * 根据组件获取组件的根 DOM 节点
   * @param component
   */
  getNativeNodeByComponent(component: Component): NativeElement | null {
    return this.componentRootElementCaches.get(component) || null
  }

  /**
   * 根据 DOM 节点，获对对应的组件根节点，如传入的 DOM 节点不为组件的根节点，则返回 null
   * @param node
   */
  getComponentByNativeNode(node: NativeElement): Component | null {
    return this.componentRootElementCaches.get(node) || null
  }

  /**
   * 根据插槽获取插槽的根 DOM 节点
   * @param slot
   */
  getNativeNodeBySlot(slot: Slot): NativeElement | null {
    return this.slotRootNativeElementCaches.get(slot) || null
  }

  /**
   * 根据 DOM 节点，获对对应的插槽根节点，如传入的 DOM 节点不为插槽的根节点，则返回 null
   * @param node
   */
  getSlotByNativeNode(node: NativeElement): Slot | null {
    return this.slotRootNativeElementCaches.get(node) || null
  }

  /**
   * 获取插槽内容节点集合
   * @param slot
   */
  getNodesBySlot(slot: Slot) {
    const rootNativeNode = this.getNativeNodeBySlot(slot)
    if (!rootNativeNode) {
      return []
    }
    const rootVNode = this.slotRootVElementCaches.get(slot)!
    return this.getNodes(rootVNode, rootNativeNode, [])
  }

  /**
   * 获取原生节点的原始数据在文档中的位置
   * @param node
   */
  getLocationByNativeNode(node: NativeElement | NativeTextNode): NodeLocation | null {
    let slotRootNode = node
    while (!this.slotRootNativeElementCaches.get(slotRootNode as NativeElement)) {
      const p = this.adapter.getParentNode(slotRootNode)
      if (!p) {
        return null
      }
      slotRootNode = p
    }
    const slot = this.slotRootNativeElementCaches.get(slotRootNode as NativeElement)
    const rootVNode = this.slotRootVElementCaches.get(slot)!
    return this.getLocation(node as NativeElement, slotRootNode as NativeElement, rootVNode)
  }

  private getNodes(vElement: VElement,
                   nativeElement: NativeElement,
                   result: Array<NativeElement | NativeTextNode>) {
    if (vElement.location) {
      result.push(nativeElement)
    }
    for (let i = 0; i < vElement.children.length; i++) {
      const vChild = vElement.children[i]
      const nativeChild = this.adapter.getChildByIndex(nativeElement, i)
      if (vChild instanceof VElement) {
        this.getNodes(vChild, nativeChild as NativeElement, result)
      } else if (vChild instanceof VTextNode) {
        result.push(nativeChild)
      } else {
        result.push(this.getNativeNodeByComponent(vChild)!)
      }
    }
    return result
  }

  private getLocation(target: NativeElement, tree: NativeElement, vNodeTree: VElement): NodeLocation | null {
    if (target === tree) {
      return { ...vNodeTree.location! }
    }
    const childNodes = this.adapter.getChildNodes(tree)
    for (let i = 0; i < childNodes.length; i++) {
      const child = vNodeTree.children[i]
      const nativeChild = childNodes[i]
      if (nativeChild === target) {
        if (child instanceof Component) {
          const index = child.parent!.indexOf(child)
          return {
            slot: child.parent!,
            startIndex: index,
            endIndex: index + 1
          }
        }
        return child?.location || null
      } else if (child instanceof VElement) {
        let r: NodeLocation | null = null
        if (this.adapter.isNativeElementNode(nativeChild)) {
          r = this.getLocation(target, nativeChild, child)
        }
        if (r) {
          return r
        }
      }
    }
    return null
  }

  /** 当前平台的复制能力 */
  abstract copy(): void
}
