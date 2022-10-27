import { Injectable, Prop } from '@tanbo/di'
import { Observable, Subject, Subscription } from '@tanbo/stream'

import {
  VElement,
  VTextNode,
  FormatItem,
  FormatTree,
  ComponentInstance,
  Slot,
  invokeListener,
  Ref,
  Event,
  NativeNode,
  SlotRenderFactory, FormatHostBindingRender, jsx, AttributeItem
} from '../model/_api'
import { NativeRenderer, RootComponentRef } from './_injection-tokens'
import { makeError } from '../_utils/make-error'
import { Controller } from './controller'

const rendererErrorFn = makeError('Renderer')

interface MapChanges {
  remove: string[]
  set: [string, any][]
}

interface ArrayChanges {
  remove: string[]
  add: string[]
}

interface ObjectChanges {
  remove: [string, any][]
  add: [string, any][]
}

function setEditable(vElement: VElement, isSlot: boolean) {
  vElement.attrs.set(isSlot ? 'textbus-slot-root' : 'textbus-component-root', '')
}

function getObjectChanges(target: Record<string, any>, source: Record<string, any>) {
  const changes: ObjectChanges = {
    remove: [],
    add: []
  }

  Object.keys(target).forEach(key => {
    const leftValue = target[key]
    if (!Reflect.has(source, key)) {
      changes.add.push([key, leftValue])
      return
    }
    const rightValue = source[key]
    if (leftValue === rightValue) {
      return
    }
    changes.add.push([key, leftValue])
    changes.remove.push([key, rightValue])
  })

  Object.keys(source).forEach(key => {
    if (!Reflect.has(target, key)) {
      changes.remove.push([key, source[key]])
    }
  })
  return changes
}

function getMapChanges(target: Map<string, any>, source: Map<string, any>) {
  const changes: MapChanges = {
    remove: [],
    set: []
  }
  target.forEach((value, key) => {
    const rightValue = source.get(key)
    if (value === rightValue) {
      return
    }
    changes.set.push([key, value])
  })

  source.forEach((value, key) => {
    if (!target.has(key)) {
      changes.remove.push(key)
    }
  })
  return changes
}

function getSetChanges(left: Set<string>, right: Set<string>) {
  const changes: ArrayChanges = {
    add: [],
    remove: []
  }

  left.forEach(i => {
    if (!right.has(i)) {
      changes.add.push(i)
    }
  })
  right.forEach(i => {
    if (!left.has(i)) {
      changes.remove.push(i)
    }
  })
  return changes
}

function getNodeChanges(newVDom: VElement, oldVDom: VElement) {
  const styleChanges = getMapChanges(newVDom.styles, oldVDom.styles)
  const attrChanges = getMapChanges(newVDom.attrs, oldVDom.attrs)
  const classesChanges = getSetChanges(newVDom.classes, oldVDom.classes)
  const listenerChanges = getObjectChanges(newVDom.listeners, oldVDom.listeners)
  return {
    styleChanges,
    attrChanges,
    classesChanges,
    listenerChanges,
    isChanged: [
      attrChanges.set.length,
      attrChanges.remove.length,
      styleChanges.set.length,
      styleChanges.remove.length,
      classesChanges.add.length,
      classesChanges.remove.length,
      listenerChanges.add.length,
      listenerChanges.remove.length
    ].join('') !== '0'.repeat(8)
  }
}

class NativeElementMappingTable {
  private nativeVDomMapping = new WeakMap<NativeNode, VElement | VTextNode>()
  private vDomNativeMapping = new WeakMap<VElement | VTextNode, NativeNode>()

  set(key: VElement | VTextNode, value: NativeNode): void
  set(key: NativeNode, value: VElement | VTextNode): void
  set(key: any, value: any) {
    if (this.get(key)) {
      this.delete(key)
    }
    if (this.get(value)) {
      this.delete(value)
    }
    if (key instanceof VElement || key instanceof VTextNode) {
      this.vDomNativeMapping.set(key, value)
      this.nativeVDomMapping.set(value, key)
    } else {
      this.vDomNativeMapping.set(value, key)
      this.nativeVDomMapping.set(key, value)
    }
  }

  get(key: VElement | VTextNode): NativeNode;
  get(key: NativeNode): VElement | VTextNode;
  get(key: any) {
    if (key instanceof VTextNode || key instanceof VElement) {
      return this.vDomNativeMapping.get(key)
    }
    return this.nativeVDomMapping.get(key)
  }

  delete(key: NativeNode | VElement | VTextNode) {
    if (key instanceof VTextNode || key instanceof VElement) {
      const v = this.vDomNativeMapping.get(key)!
      this.vDomNativeMapping.delete(key)
      this.nativeVDomMapping.delete(v)
    } else {
      const v = this.nativeVDomMapping.get(key)!
      this.nativeVDomMapping.delete(key)
      this.vDomNativeMapping.delete(v)
    }
  }
}

/**
 * 虚拟 DOM 节点在数据内的范围
 */
export interface VNodeLocation {
  startIndex: number
  endIndex: number
  slot: Slot
}

/**
 * Textbus 编辑渲染器，负责组件的渲染，生成 DOM，并根据数据变化，更新 DOM
 */
@Injectable()
export class Renderer {
  /**
   * 视图更新前触发
   */
  onViewUpdateBefore: Observable<void>
  /**
   * 视图更新后触发
   */
  onViewUpdated: Observable<void>

  /**
   * 原生渲染器
   */
  @Prop()
  nativeRenderer!: NativeRenderer

  private componentVNode = new WeakMap<ComponentInstance, VElement>()
  private slotRootVNodeCaches = new WeakMap<Slot, VElement>()
  private vNodeLocation = new WeakMap<VElement | VTextNode, VNodeLocation>()
  private renderedVNode = new WeakMap<VElement | VTextNode, true>()
  private slotVNodesCaches = new WeakMap<Slot, Array<VElement | VTextNode>>()

  private slotRenderFactory = new WeakMap<Slot, SlotRenderFactory>()

  private nativeNodeCaches = new NativeElementMappingTable()

  private viewUpdatedEvent = new Subject<void>()
  private viewUpdateBeforeEvent = new Subject<void>()
  private oldVDom: VElement | null = null

  private slotIdAttrKey = '__textbus-slot-id__'
  private readonlyStateChanged = false

  private subscription = new Subscription()

  private renderedComponents: ComponentInstance[] = []

  constructor(private controller: Controller,
              private rootComponentRef: RootComponentRef) {
    this.onViewUpdated = this.viewUpdatedEvent.asObservable()
    this.onViewUpdateBefore = this.viewUpdateBeforeEvent.asObservable()
    this.subscription = controller.onReadonlyStateChange.subscribe(() => {
      if (rootComponentRef.component) {
        this.readonlyStateChanged = true
        this.render()
        this.readonlyStateChanged = false
      }
    })
  }

  /**
   * 以编辑模式渲染当前文档
   */
  render() {
    const component = this.rootComponentRef.component
    this.viewUpdateBeforeEvent.next()
    if (component.changeMarker.changed || this.readonlyStateChanged) {
      const dirty = component.changeMarker.dirty
      const root = this.componentRender(component)
      // hack 防止根节点替换插件时，没有父级虚拟 DOM 节点
      new VElement('html', null, [root])
      // hack end
      if (dirty || this.readonlyStateChanged) {
        if (this.oldVDom) {
          const oldNativeNode = this.nativeNodeCaches.get(this.oldVDom)
          const newNativeNode = this.diffAndUpdate(root, this.oldVDom, component)
          if (oldNativeNode !== newNativeNode) {
            this.nativeRenderer.replace(newNativeNode, oldNativeNode)
          }
        } else {
          const el = this.patch(root)
          this.nativeRenderer.appendChild(this.rootComponentRef.host, el)
        }
      }
      this.oldVDom = root
    }

    Promise.resolve().then(() => {
      let index = this.renderedComponents.length - 1
      while (index > -1) {
        const item = this.renderedComponents[index]
        index--
        invokeListener(item, 'onViewChecked')
      }
      this.renderedComponents = []
      this.viewUpdatedEvent.next()
    })
  }

  /**
   * 获取组件对应的虚拟 DOM 节点
   * @param component
   */
  getVNodeByComponent(component: ComponentInstance) {
    return this.componentVNode.get(component)
  }

  /**
   * 获取插槽 对应的虚拟 DOM 节点
   * @param slot
   */
  getVNodeBySlot(slot: Slot) {
    return this.slotRootVNodeCaches.get(slot)
  }

  /**
   * 通过虚拟 DOM 节点获取对应的原生节点
   * @param vNode
   */
  getNativeNodeByVNode(vNode: VElement | VTextNode): NativeNode {
    return this.nativeNodeCaches.get(vNode)
  }

  /**
   * 获取原生节点对应的虚拟 DOM 节点
   * @param nativeNode
   */
  getVNodeByNativeNode(nativeNode: NativeNode) {
    return this.nativeNodeCaches.get(nativeNode)
  }

  /**
   * 获取虚拟 DOM 节点的原始数据在文档中的位置
   * @param node
   */
  getLocationByVNode(node: VElement | VTextNode | Slot) {
    if (node instanceof Slot) {
      node = this.slotRootVNodeCaches.get(node)!
    }
    return this.vNodeLocation.get(node)
  }

  /**
   * 获取原生节点的原始数据在文档中的位置
   * @param node
   */
  getLocationByNativeNode(node: NativeNode) {
    const vNode = this.nativeNodeCaches.get(node)
    return this.vNodeLocation.get(vNode) || null
  }

  /**
   * 获取插槽内容节点集合
   * @param slot
   */
  getVNodesBySlot(slot: Slot) {
    return this.slotVNodesCaches.get(slot) || []
  }

  /**
   * 销毁渲染器
   */
  destroy() {
    this.subscription.unsubscribe()
  }

  private sortAndCleanNativeNode(parent: NativeNode, children: NativeNode[], component: ComponentInstance) {
    let index = 0
    while (true) {
      const node = children[index]
      if (!node) {
        break
      }
      const current = this.nativeRenderer.getChildByIndex(parent, index)
      index++
      if (!current) {
        this.nativeRenderer.appendChild(parent, node)
        continue
      }
      if (current !== node) {
        this.nativeRenderer.insertBefore(node, current)
      }
    }
    while (true) {
      const current = this.nativeRenderer.getChildByIndex(parent, index)
      if (!current) {
        break
      }
      const event = new Event<ComponentInstance, NativeNode>(component, current)
      invokeListener(component, 'onDirtyViewClean', event)
      if (event.isPrevented) {
        index++
        continue
      }
      this.nativeRenderer.remove(current)
    }
    return parent
  }

  private diffAndUpdate(newVDom: VElement, oldVDom: VElement, component: ComponentInstance) {
    const newNativeNode = this.diffNodeAndUpdate(newVDom, oldVDom)

    const children = this.diffChildrenAndUpdate(newVDom, oldVDom, component)

    return this.sortAndCleanNativeNode(newNativeNode, children, component)
  }

  private diffChildrenAndUpdate(newVDom: VElement, oldVDom: VElement, component: ComponentInstance) {
    const newChildren = newVDom.children
    const oldChildren = oldVDom.children

    const beginIdenticalNodes = this.diffIdenticalChildrenToEnd(newChildren, oldChildren, component)
    const endIdenticalNodes = this.diffIdenticalChildrenToBegin(newChildren, oldChildren, component)

    const beginNodes = this.diffChildrenToEnd(newChildren, oldChildren, component)
    const endNodes = this.diffChildrenToBegin(newChildren, oldChildren, component)


    oldChildren.forEach(i => {
      const native = this.nativeNodeCaches.get(i)
      if (native) {
        this.nativeRenderer.remove(native)
      }
    })

    return [
      ...beginIdenticalNodes,
      ...beginNodes,
      ...newChildren.map(i => {
        if (this.renderedVNode.has(i)) {
          return this.nativeNodeCaches.get(i)
        }
        return this.patch(i)
      }),
      ...endNodes,
      ...endIdenticalNodes
    ]
  }

  private diffIdenticalChildrenToEnd(
    newChildren: Array<VElement | VTextNode>,
    oldChildren: Array<VElement | VTextNode>,
    component: ComponentInstance): NativeNode[] {
    const children: NativeNode[] = []
    while (newChildren.length && oldChildren.length) {
      const newFirstVNode = newChildren[0]
      const oldFirstVNode = oldChildren[0]

      if (newFirstVNode instanceof VElement && oldFirstVNode instanceof VElement) {
        if (this.renderedVNode.has(newFirstVNode)) {
          newChildren.shift()
          children.push(this.nativeNodeCaches.get(newFirstVNode))
          continue
        }
        if (newFirstVNode.tagName !== oldFirstVNode.tagName) {
          break
        }
        const { isChanged } = getNodeChanges(newFirstVNode, oldFirstVNode)

        if (isChanged) {
          break
        }
        newChildren.shift()
        oldChildren.shift()
        let nativeNode = this.nativeNodeCaches.get(oldFirstVNode)
        if (nativeNode) {
          this.nativeNodeCaches.set(newFirstVNode, nativeNode)
          this.renderedVNode.set(newFirstVNode, true)
        } else {
          nativeNode = this.createElement(newFirstVNode)
        }
        const cc = this.diffChildrenAndUpdate(newFirstVNode, oldFirstVNode, component)
        children.push(this.sortAndCleanNativeNode(nativeNode, cc, component))
      } else {
        break
      }
    }
    return children
  }

  private diffIdenticalChildrenToBegin(
    newChildren: Array<VElement | VTextNode>,
    oldChildren: Array<VElement | VTextNode>,
    component: ComponentInstance): NativeNode[] {
    const children: NativeNode[] = []
    while (newChildren.length && oldChildren.length) {
      const newLastVNode = newChildren[newChildren.length - 1]
      const oldLastVNode = oldChildren[oldChildren.length - 1]

      if (newLastVNode instanceof VElement && oldLastVNode instanceof VElement) {
        if (this.renderedVNode.has(newLastVNode)) {
          newChildren.pop()
          children.push(this.nativeNodeCaches.get(newLastVNode))
          continue
        }
        if (newLastVNode.tagName !== oldLastVNode.tagName) {
          break
        }
        const { isChanged } = getNodeChanges(newLastVNode, oldLastVNode)

        if (isChanged) {
          break
        }
        newChildren.pop()
        oldChildren.pop()
        let nativeNode = this.nativeNodeCaches.get(oldLastVNode)
        if (nativeNode) {
          this.nativeNodeCaches.set(newLastVNode, nativeNode)
          this.renderedVNode.set(newLastVNode, true)
        } else {
          nativeNode = this.createElement(newLastVNode)
        }
        const cc = this.diffChildrenAndUpdate(newLastVNode, oldLastVNode, component)
        children.push(this.sortAndCleanNativeNode(nativeNode, cc, component))
      } else {
        break
      }

    }
    return children.reverse()
  }

  private diffChildrenToEnd(
    newChildren: Array<VElement | VTextNode>,
    oldChildren: Array<VElement | VTextNode>,
    component: ComponentInstance): NativeNode[] {
    const children: NativeNode[] = []
    while (newChildren.length && oldChildren.length) {
      const newFirstVNode = newChildren[0]
      const oldFirstVNode = oldChildren[0]

      if (newFirstVNode instanceof VElement) {
        if (this.renderedVNode.has(newFirstVNode)) {
          newChildren.shift()
          children.push(this.nativeNodeCaches.get(newFirstVNode))
          continue
        }
        if (oldFirstVNode instanceof VElement && newFirstVNode.tagName === oldFirstVNode.tagName) {
          const nativeNode = this.diffAndUpdate(newFirstVNode, oldFirstVNode, component)

          children.push(nativeNode)
          newChildren.shift()
          oldChildren.shift()
        } else {
          break
        }
      } else {
        if (this.renderedVNode.has(newFirstVNode)) {
          newChildren.shift()
          children.push(this.nativeNodeCaches.get(newFirstVNode))
          continue
        }
        if (oldFirstVNode instanceof VTextNode && newFirstVNode.textContent === oldFirstVNode.textContent) {
          const nativeNode = this.nativeNodeCaches.get(oldFirstVNode)
          this.nativeNodeCaches.set(newFirstVNode, nativeNode)
          children.push(nativeNode)
          this.nativeRenderer.syncTextContent(nativeNode, newFirstVNode.textContent)
          newChildren.shift()
          oldChildren.shift()
        } else {
          break
        }
      }
    }
    return children
  }

  private diffChildrenToBegin(
    newChildren: Array<VElement | VTextNode>,
    oldChildren: Array<VElement | VTextNode>,
    component: ComponentInstance): NativeNode[] {
    const children: NativeNode[] = []
    while (newChildren.length && oldChildren.length) {
      const newLastVNode = newChildren[newChildren.length - 1]
      const oldLastVNode = oldChildren[oldChildren.length - 1]

      if (newLastVNode instanceof VElement) {
        if (this.renderedVNode.has(newLastVNode)) {
          newChildren.pop()
          children.push(this.nativeNodeCaches.get(newLastVNode))
          continue
        }
        if (oldLastVNode instanceof VElement && newLastVNode.tagName === oldLastVNode.tagName) {
          const nativeNode = this.diffAndUpdate(newLastVNode, oldLastVNode, component)

          children.push(nativeNode)
          newChildren.pop()
          oldChildren.pop()
        } else {
          break
        }
      } else {
        if (this.renderedVNode.has(newLastVNode)) {
          newChildren.pop()
          children.push(this.nativeNodeCaches.get(newLastVNode))
          continue
        }
        if (oldLastVNode instanceof VTextNode && newLastVNode.textContent === oldLastVNode.textContent) {
          const nativeNode = this.nativeNodeCaches.get(oldLastVNode)
          this.nativeNodeCaches.set(newLastVNode, nativeNode)
          children.push(nativeNode)
          this.nativeRenderer.syncTextContent(nativeNode, newLastVNode.textContent)
          newChildren.pop()
          oldChildren.pop()
        } else {
          break
        }
      }
    }
    return children.reverse()
  }

  private diffNodeAndUpdate(newVDom: VElement, oldVDom: VElement) {
    let nativeNode = this.nativeNodeCaches.get(oldVDom)

    if (oldVDom.tagName !== newVDom.tagName) {
      nativeNode = this.createElement(newVDom)
    } else {
      const { styleChanges, attrChanges, classesChanges, listenerChanges } = getNodeChanges(newVDom, oldVDom)

      styleChanges.remove.forEach(i => this.nativeRenderer.removeStyle(nativeNode, i))
      styleChanges.set.forEach(i => this.nativeRenderer.setStyle(nativeNode, i[0], i[1]))

      attrChanges.remove.forEach(i => this.nativeRenderer.removeAttribute(nativeNode, i))
      attrChanges.set.forEach(([key, value]) => {
        if (key === this.slotIdAttrKey) {
          return
        }
        if (key === 'ref' && value instanceof Ref) {
          value.current = nativeNode
          return
        }
        this.nativeRenderer.setAttribute(nativeNode, key, value)
      })

      classesChanges.remove.forEach(i => this.nativeRenderer.removeClass(nativeNode, i))
      classesChanges.add.forEach(i => this.nativeRenderer.addClass(nativeNode, i))

      listenerChanges.remove.forEach(i => {
        this.nativeRenderer.unListen(nativeNode, i[0], i[1])
      })
      if (!this.controller.readonly) {
        listenerChanges.add.forEach(i => {
          this.nativeRenderer.listen(nativeNode, i[0], i[1])
        })
      }

      this.renderedVNode.set(newVDom, true)
      this.nativeNodeCaches.set(newVDom, nativeNode)
    }
    return nativeNode
  }

  private patch(vDom: VElement | VTextNode) {
    if (vDom instanceof VElement) {
      const el = this.createElement(vDom)
      vDom.children.forEach(child => {
        if (this.renderedVNode.get(child)) {
          this.nativeRenderer.appendChild(el, this.nativeNodeCaches.get(child))
        } else {
          this.nativeRenderer.appendChild(el, this.patch(child))
        }
      })
      return el
    }
    return this.createTextNode(vDom)
  }

  private extractVNodesBySlot(slot: Slot, tree: Array<VElement | VTextNode>, vNodes: Array<VTextNode | VElement>) {
    for (const child of tree) {
      const position = this.getLocationByVNode(child)
      if (position) {
        if (position.slot === slot) {
          vNodes.push(child)
        } else {
          break
        }
        if (child instanceof VElement) {
          this.extractVNodesBySlot(slot, child.children, vNodes)
        }
      }
    }
    return vNodes
  }

  private componentRender(component: ComponentInstance): VElement {
    this.renderedComponents.push(component)
    if (component.changeMarker.dirty || this.readonlyStateChanged) {
      const node = component.extends.render(this.controller.readonly, (slot, factory) => {
        return this.slotRender(component, slot, children => {
          const vNodes = this.extractVNodesBySlot(slot, children, [])
          this.slotVNodesCaches.set(slot, vNodes)
          return factory(children)
        })
      })
      setEditable(node, false)
      this.componentVNode.set(component, node)
      component.changeMarker.rendered()
      return node
    }
    if (component.changeMarker.changed) {
      const oldComponentVNode = this.componentVNode.get(component)
      component.slots.toArray().forEach(slot => {
        if (!slot.changeMarker.changed) {
          return
        }
        const dirty = slot.changeMarker.dirty
        const oldVNode = this.slotRootVNodeCaches.get(slot)!
        const factory = this.slotRenderFactory.get(slot)!
        const vNode = this.slotRender(component, slot, factory)
        if (dirty) {
          if (oldComponentVNode === oldVNode) {
            this.componentVNode.set(component, vNode)
            setEditable(vNode, false)
          }
          (oldVNode.parentNode as VElement).replaceChild(vNode, oldVNode)
          const oldNativeNode = this.nativeNodeCaches.get(oldVNode)
          const newNativeNode = this.diffAndUpdate(vNode, oldVNode, component)
          this.nativeNodeCaches.set(newNativeNode, vNode)
          this.slotRootVNodeCaches.set(slot, vNode)
          if (oldNativeNode !== newNativeNode) {
            this.nativeRenderer.replace(newNativeNode, oldNativeNode)
          }
        }
      })
      component.changeMarker.rendered()
    }
    return this.componentVNode.get(component)!
  }

  private slotRender(component: ComponentInstance, slot: Slot, slotRenderFactory: SlotRenderFactory): VElement {
    if (!(slot instanceof Slot)) {
      throw rendererErrorFn(`${slot} of the component \`${component.name}\` is not a Slot instance.`)
    }
    if (typeof slotRenderFactory !== 'function') {
      throw rendererErrorFn(`component \`${component.name}\` slot render is not a function.`)
    }
    if (slot.changeMarker.dirty || this.readonlyStateChanged) {
      this.slotRenderFactory.set(slot, slotRenderFactory)
      const formatTree = slot.createFormatTree()

      const children = formatTree.children ?
        this.createVDomByFormatTree(slot, formatTree.children) :
        this.createVDomByContent(slot, formatTree.startIndex, formatTree.endIndex)

      let root: VElement
      if (formatTree.formats) {
        root = this.createVDomByOverlapFormats(formatTree.formats, children, slot, nextChildren => {
          return slotRenderFactory(nextChildren)
        })
      } else {
        root = slotRenderFactory(children)
      }
      if (!(root instanceof VElement)) {
        throw rendererErrorFn(`component \`${component.name}\` slot rendering does not return a VElement.`)
      }
      root.attrs.set(this.slotIdAttrKey, slot.id)
      setEditable(root, true)
      this.vNodeLocation.set(root, {
        slot: slot,
        startIndex: 0,
        endIndex: slot.length
      })
      slot.changeMarker.rendered()
      this.slotRootVNodeCaches.set(slot, root)
      return root
    }
    slot.sliceContent().filter((i): i is ComponentInstance => {
      return typeof i !== 'string'
    }).forEach(component => {
      if (!component.changeMarker.changed) {
        return
      }
      const dirty = component.changeMarker.dirty
      const oldVNode = this.componentVNode.get(component)!
      const vNode = this.componentRender(component)
      const startIndex = slot.indexOf(component)
      this.vNodeLocation.set(vNode, {
        slot,
        startIndex,
        endIndex: startIndex + 1
      })
      if (dirty) {
        (oldVNode.parentNode as VElement).replaceChild(vNode, oldVNode)
        const oldNativeNode = this.nativeNodeCaches.get(oldVNode)
        const newNativeNode = this.diffAndUpdate(vNode, oldVNode, component)
        if (oldNativeNode !== newNativeNode) {
          this.nativeRenderer.replace(newNativeNode, oldNativeNode)
        }
      }
    })
    slot.changeMarker.rendered()
    return this.slotRootVNodeCaches.get(slot)!
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
          children,
          slot,
          nextChildren => {
            if (nextChildren.length === 1 && nextChildren[0] instanceof VElement) {
              return nextChildren[0]
            }
          }
        )
        nodes.push(nextChildren)
      } else {
        nodes.push(...this.createVDomByContent(slot, child.startIndex, child.endIndex))
      }
    }
    return nodes
  }

  private createVDomByOverlapFormats(
    formats: (FormatItem<any> | AttributeItem<any>)[],
    children: Array<VElement | VTextNode>,
    slot: Slot,
    getWrapper: (nextChildren: Array<VElement | VTextNode>) => VElement | void): VElement {
    const hostBindings: Array<{ render: FormatHostBindingRender, item: FormatItem<any> | AttributeItem<any> }> = []
    // formats = formatSort(formats)
    for (let i = formats.length - 1; i > -1; i--) {
      const item = formats[i]
      const next = item.formatter.render(children, item.value, this.controller.readonly)
      if (!next) {
        throw rendererErrorFn(`Formatter \`${item.formatter.name}\` must return an VElement!`)
      }
      if (!(next instanceof VElement)) {
        hostBindings.push({
          item,
          render: next
        })
        continue
      }
      this.vNodeLocation.set(next, {
        slot,
        startIndex: item.startIndex,
        endIndex: item.endIndex
      })
      children = [next]
    }
    let host = getWrapper(children)
    for (const binding of hostBindings) {
      const { render, item } = binding
      if (!host) {
        host = jsx(render.fallbackTagName)
        host.appendChild(...children)
        this.vNodeLocation.set(host, {
          slot,
          startIndex: item.startIndex,
          endIndex: item.endIndex
        })
      }
      render.attach(host)
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
      this.vNodeLocation.set(vNode, {
        slot,
        startIndex,
        endIndex: startIndex + length
      })
      startIndex += length
      return vNode
    })
  }

  private createElement(vDom: VElement) {
    this.renderedVNode.set(vDom, true)
    const el = this.nativeRenderer.createElement(vDom.tagName)
    vDom.attrs.forEach((value, key) => {
      if (key === this.slotIdAttrKey) {
        return
      }
      if (key === 'ref') {
        if (value instanceof Ref) {
          value.current = el
        }
        return
      }
      this.nativeRenderer.setAttribute(el, key, value)
    })
    vDom.styles.forEach((value, key) => {
      this.nativeRenderer.setStyle(el, key, value)
    })
    vDom.classes.forEach(k => this.nativeRenderer.addClass(el, k))

    if (!this.controller.readonly) {
      Object.keys(vDom.listeners).forEach(type => {
        this.nativeRenderer.listen(el, type, vDom.listeners[type])
      })
    }
    this.nativeNodeCaches.set(el, vDom)
    return el
  }

  private createTextNode(vDom: VTextNode) {
    this.renderedVNode.set(vDom, true)
    const el = this.nativeRenderer.createTextNode(vDom.textContent)
    this.nativeNodeCaches.set(el, vDom)
    return el
  }
}
