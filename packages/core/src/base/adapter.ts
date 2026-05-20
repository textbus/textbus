import { Observable } from '@tanbo/stream'
import { Injector } from '@viewfly/core'

import { Component } from '../model/component'
import { applyCompositionContext, Slot } from '../model/slot'
import { NodeLocation, VElement, VTextNode } from '../model/element'
import { createBidirectionalMapping, replaceEmpty } from '../_utils/tools'
import { Format } from '../model/format'
import { Decorator } from '../model/decorator'

export interface ViewMount<ViewComponent, NativeElement> {
  (host: NativeElement, viewComponent: ViewComponent, injector: Injector): (void | (() => void))
}

/**
 * 视图渲染器抽象接口
 */
export interface Renderer<ViewComponent, ViewElement, NativeElement, NativeTextNode> {
  componentRender(component: Component<any>): ViewComponent

  vElementToViewElement(vEle: VElement, children: Array<ViewElement | ViewComponent | string>): ViewElement

  getAndUpdateSlotRootNativeElement(vEle: VElement, update: (nativeElement: NativeElement | null) => void): void

  createCompositionNode(
    compositionState: CompositionState,
    updateNativeCompositionNode: (nativeNode: NativeElement | null) => void
  ): ViewElement

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

class InputDecorator extends Decorator {
}

/**
 * Textbus 渲染适配器
 */
export abstract class Adapter<
  NativeElement extends {} = {},
  NativeTextNode extends {} = {},
  ViewComponent extends {} = {},
  ViewElement extends {} = {}
> {
  composition: CompositionState | null = null
  /** 当视图更新时触发事件的可观察对象，用于通知 Textbus 视图渲染已完成 */
  abstract onViewUpdated: Observable<void>
  abstract host: NativeElement

  protected slotRootVElementCaches = new WeakMap<Slot, VElement>()
  protected slotRootNativeElementCaches = createBidirectionalMapping<Slot, NativeElement>(a => {
    return a instanceof Slot
  })
  protected componentRootElementCaches = createBidirectionalMapping<Component, NativeElement>(a => {
    return a instanceof Component
  })

  compositionNode: any = null
  private inputDecorator = new InputDecorator()

  protected constructor(private adapter: Renderer<ViewComponent, ViewElement, NativeElement, NativeTextNode>,
                        private mount: ViewMount<ViewComponent, NativeElement>) {
  }

  /** 根组件渲染方法 */
  render(rootComponent: Component, injector: Injector): void | (() => void) {
    const view = this.componentRender(rootComponent)
    return this.mount(this.host, view, injector)
  }

  componentRender(component: Component<any>): ViewComponent {
    return this.adapter.componentRender(component)
  }

  slotRender(slot: Slot,
             slotHostRender: (children: Array<VElement | VTextNode | Component>) => VElement,
             renderEnv?: any): ViewElement;
  slotRender(slot: Slot,
             customFormat: Format,
             slotHostRender: (children: Array<VElement | VTextNode | Component>) => VElement,
             renderEnv?: any): ViewElement;
  slotRender(slot: Slot,
             customFormat: any,
             slotHostRender: any,
             renderEnv?: any): ViewElement {
    if (typeof customFormat === 'function') {
      renderEnv = slotHostRender
      slotHostRender = customFormat
      customFormat = null
    }
    const composition = this.composition
    let vElement: VElement
    if (composition && composition.slot === slot) {
      vElement = applyCompositionContext({
        decorator: this.inputDecorator,
        index: composition.index,
      }, () => {
        return slot.toTree(slotHostRender, customFormat, renderEnv)
      })
    } else {
      vElement = slot.toTree(slotHostRender, customFormat, renderEnv)
    }
    this.slotRootVElementCaches.set(slot, vElement)

    const oldNativeNode = this.slotRootNativeElementCaches.get(slot)
    this.adapter.getAndUpdateSlotRootNativeElement(vElement, nativeElement => {
      if (nativeElement) {
        this.slotRootNativeElementCaches.set(slot, nativeElement)
      } else if (this.slotRootNativeElementCaches.get(slot) === oldNativeNode) {
        // 当组件或插槽移动层级位置到原位置之前并重新渲染后，由于时序的原因，再删除缓存会导致组件找不到对应视图节点
        this.slotRootNativeElementCaches.remove(slot)
      }
    })
    const jsxNode = this.vElementToViewElement(vElement, slot)
    slot.__changeMarker__.rendered()
    return jsxNode
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
      } else if (vChild instanceof Component) {
        result.push(this.getNativeNodeByComponent(vChild)!)
      }
    }
    return result
  }

  private getLocation(target: NativeElement, tree: NativeElement, vNodeTree: VElement): NodeLocation | null {
    if (target === tree) {
      return {...vNodeTree.location!}
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
        } else if (child instanceof Decorator) {
          return null
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

  /** 将虚拟树节点转换为视图树节点 */
  vElementToViewElement(vNode: VElement, slot?: Slot): ViewElement {
    const children: Array<ViewElement | ViewComponent | string> = []
    for (let i = 0; i < vNode.children.length; i++) {
      const child = vNode.children[i]
      if (child instanceof VElement) {
        children.push(this.vElementToViewElement(child, slot))
      } else if (child instanceof VTextNode) {
        children.push(replaceEmpty(child.textContent))
      } else if (child instanceof Component) {
        children.push(this.componentRender(child))
      } else if (this.composition) {
        const el = this.adapter.createCompositionNode(this.composition, compositionNode => {
          this.compositionNode = compositionNode
        })
        children.push(el)
      }
    }
    return this.adapter.vElementToViewElement(vNode, children)
  }
}
