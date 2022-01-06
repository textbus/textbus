import { Inject, Injectable } from '@tanbo/di'
import { Observable, Subject } from '@tanbo/stream'

import {
  VElement,
  VTextNode,
  FormatItem,
  FormatTree,
  ComponentInstance,
  Slot,
} from '../model/_api'
import { invokeListener, Ref } from '../define-component'
import { HOST_NATIVE_NODE, NativeNode, NativeRenderer } from './_injection-tokens'

export interface MapChanges {
  remove: string[]
  set: [string, any][]
}

export interface ArrayChanges {
  remove: string[]
  add: string[]
}

export interface ObjectChanges {
  remove: [string, any][]
  add: [string, any][]
}

function setEditable(vElement: VElement, is: boolean | null) {
  if (is === null) {
    vElement.attrs.delete('textbus-editable')
    return
  }
  vElement.attrs.set('textbus-editable', is ? 'on' : 'off')
}

export function formatSort(formats: FormatItem[]) {
  formats.sort((a, b) => {
    return a.formatter.type - b.formatter.type
  })
  return formats
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
    if (!target.has(key)) {
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
  return {
    styleChanges: getMapChanges(newVDom.styles, oldVDom.styles),
    attrChanges: getMapChanges(newVDom.attrs, oldVDom.attrs),
    classesChanges: getSetChanges(newVDom.classes, oldVDom.classes),
    listenerChanges: getObjectChanges(newVDom.listeners, oldVDom.listeners)
  }
}

class NativeElementMappingTable {
  private nativeVDomMapping = new WeakMap<NativeNode, VElement | VTextNode>()
  private vDomNativeMapping = new WeakMap<VElement | VTextNode, NativeNode>()

  set(key: NativeNode, value: VElement | VTextNode): void
  set(key: VElement | VTextNode, value: NativeNode): void
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

  get(key: NativeNode): VElement | VTextNode;
  get(key: VElement | VTextNode): NativeNode;
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

export interface VNodeLocation {
  startIndex: number
  endIndex: number
  slot: Slot
}

@Injectable()
export class Renderer {
  onViewUpdateBefore: Observable<void>
  onViewChecked: Observable<void>

  private componentVNode = new WeakMap<ComponentInstance, VElement>()

  private slotVNodeCaches = new WeakMap<Slot, VElement>()

  private vNodeLocation = new WeakMap<VElement | VTextNode, VNodeLocation>()

  private renderedVNode = new WeakMap<VElement | VTextNode, true>()

  private slotRenderFactory = new WeakMap<Slot, () => VElement>()

  private nativeNodeCaches = new NativeElementMappingTable()

  private viewCheckedEvent = new Subject<void>()
  private viewUpdateBeforeEvent = new Subject<void>()
  private oldVDom: VElement | null = null

  private slotIdAttrKey = '__textbus-slot-id__'

  constructor(@Inject(HOST_NATIVE_NODE) private host: NativeNode,
              private nativeRenderer: NativeRenderer) {
    this.onViewChecked = this.viewCheckedEvent.asObservable()
    this.onViewUpdateBefore = this.viewUpdateBeforeEvent.asObservable()
  }

  render(component: ComponentInstance) {
    this.viewUpdateBeforeEvent.next()
    if (component.changeMarker.changed) {
      const dirty = component.changeMarker.dirty
      const root = this.componentRender(component)
      // hack 防止根节点替换插件时，没有父级虚拟 DOM 节点
      new VElement('html', null, [root])
      // hack end
      if (dirty) {
        if (this.oldVDom) {
          const oldNativeNode = this.nativeNodeCaches.get(this.oldVDom)
          const newNativeNode = this.diffAndUpdate(root, this.oldVDom)
          if (oldNativeNode !== newNativeNode) {
            this.nativeRenderer.replace(newNativeNode, oldNativeNode)
          }
        } else {
          const el = this.patch(root)
          this.nativeRenderer.appendChild(this.host, el)
        }
        this.oldVDom = root
      }
    }

    this.viewCheckedEvent.next()
  }

  getVNodeByComponent(component: ComponentInstance) {
    return this.componentVNode.get(component)
  }

  getVNodeBySlot(slot: Slot) {
    return this.slotVNodeCaches.get(slot)
  }

  getNativeNodeByVNode(vNode: VElement | VTextNode): any {
    return this.nativeNodeCaches.get(vNode)
  }

  getLocationByVNode(node: VElement | VTextNode | Slot) {
    if (node instanceof Slot) {
      node = this.slotVNodeCaches.get(node)!
    }
    return this.vNodeLocation.get(node)
  }

  getLocationByNativeNode(node: NativeNode) {
    const vNode = this.nativeNodeCaches.get(node)
    return this.vNodeLocation.get(vNode) || null
  }

  private sortNativeNode(parent: NativeNode, children: NativeNode[]) {
    children.forEach((node, index) => {
      const current = this.nativeRenderer.getChildByIndex(parent, index)
      if (!current) {
        this.nativeRenderer.appendChild(parent, node)
        return
      }
      if (current !== node) {
        this.nativeRenderer.insertBefore(node, current)
      }
    })
    return parent
  }

  private diffAndUpdate(newVDom: VElement, oldVDom: VElement) {
    const newNativeNode = this.diffNodeAndUpdate(newVDom, oldVDom)

    const children = this.diffChildrenAndUpdate(newVDom, oldVDom)

    return this.sortNativeNode(newNativeNode, children)
  }

  private diffChildrenAndUpdate(newVDom: VElement, oldVDom: VElement) {
    const newChildren = newVDom.children
    const oldChildren = oldVDom.children

    const beginIdenticalNodes = this.diffIdenticalChildrenToEnd(newChildren, oldChildren)
    const endIdenticalNodes = this.diffIdenticalChildrenToBegin(newChildren, oldChildren)

    const beginNodes = this.diffChildrenToEnd(newChildren, oldChildren)
    const endNodes = this.diffChildrenToBegin(newChildren, oldChildren)


    oldChildren.forEach(i => {
      const native = this.nativeNodeCaches.get(i)!
      this.nativeRenderer.remove(native)
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

  private diffIdenticalChildrenToEnd(newChildren: Array<VElement | VTextNode>, oldChildren: Array<VElement | VTextNode>): NativeNode[] {
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
        const {attrChanges, styleChanges, classesChanges, listenerChanges} = getNodeChanges(newFirstVNode, oldFirstVNode)
        const isChanged = [
          attrChanges.set.length,
          attrChanges.remove.length,
          styleChanges.set.length,
          styleChanges.remove.length,
          classesChanges.add.length,
          classesChanges.remove.length,
          listenerChanges.add.length,
          listenerChanges.remove.length
        ].join('') !== '00000000'

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
        const cc = this.diffChildrenAndUpdate(newFirstVNode, oldFirstVNode)
        children.push(this.sortNativeNode(nativeNode, cc))
      } else {
        break
      }
    }
    return children
  }

  private diffIdenticalChildrenToBegin(newChildren: Array<VElement | VTextNode>, oldChildren: Array<VElement | VTextNode>): NativeNode[] {
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
        const {attrChanges, styleChanges, classesChanges, listenerChanges} = getNodeChanges(newLastVNode, oldLastVNode)
        const isChanged = [
          attrChanges.set.length,
          attrChanges.remove.length,
          styleChanges.set.length,
          styleChanges.remove.length,
          classesChanges.add.length,
          classesChanges.remove.length,
          listenerChanges.add.length,
          listenerChanges.remove.length
        ].join('') !== '00000000'

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
        const cc = this.diffChildrenAndUpdate(newLastVNode, oldLastVNode)
        children.push(this.sortNativeNode(nativeNode, cc))
      } else {
        break
      }

    }
    return children.reverse()
  }

  private diffChildrenToEnd(newChildren: Array<VElement | VTextNode>, oldChildren: Array<VElement | VTextNode>): NativeNode[] {
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
          const nativeNode = this.diffAndUpdate(newFirstVNode, oldFirstVNode)

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
          newChildren.shift()
          oldChildren.shift()
        } else {
          break
        }
      }
    }
    return children
  }

  private diffChildrenToBegin(newChildren: Array<VElement | VTextNode>, oldChildren: Array<VElement | VTextNode>): NativeNode[] {
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
          const nativeNode = this.diffAndUpdate(newLastVNode, oldLastVNode)

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
      const {styleChanges, attrChanges, classesChanges, listenerChanges} = getNodeChanges(newVDom, oldVDom)

      styleChanges.set.forEach(i => this.nativeRenderer.setStyle(nativeNode, i[0], i[1]))
      styleChanges.remove.forEach(i => this.nativeRenderer.setStyle(nativeNode, i, ''))

      attrChanges.set.forEach(([key, value]) => {
        if (key === this.slotIdAttrKey) {
          return
        }
        this.nativeRenderer.setAttribute(nativeNode, key, value)
      })
      attrChanges.remove.forEach(i => this.nativeRenderer.removeAttribute(nativeNode, i))

      classesChanges.add.forEach(i => this.nativeRenderer.addClass(nativeNode, i))
      classesChanges.remove.forEach(i => this.nativeRenderer.removeClass(nativeNode, i))

      listenerChanges.add.forEach(i => {
        this.nativeRenderer.listen(nativeNode, i[0], i[1])
      })
      listenerChanges.remove.forEach(i => {
        this.nativeRenderer.unListen(nativeNode, i[0], i[1])
      })

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

  private componentRender(component: ComponentInstance): VElement {
    if (component.changeMarker.dirty) {
      Promise.resolve().then(() => {
        invokeListener(component, 'onViewChecked')
      })
      let slotVNode!: VElement
      const node = component.methods.render(false, (slot, factory) => {
        slotVNode = this.slotRender(slot, factory)
        return slotVNode
      })
      if (component.slots.length === 1 && slotVNode === node) {
        setEditable(node, null)
      } else {
        setEditable(node, false)
      }
      component.changeMarker.rendered()
      this.componentVNode.set(component, node)
      return node
    }
    const oldComponentVNode = this.componentVNode.get(component)
    component.slots.toArray().forEach(slot => {
      if (!slot.changeMarker.changed) {
        return
      }
      const dirty = slot.changeMarker.dirty
      const oldVNode = this.slotVNodeCaches.get(slot)!
      const factory = this.slotRenderFactory.get(slot)!
      const vNode = this.slotRender(slot, factory)
      if (dirty) {
        if (oldComponentVNode === oldVNode) {
          this.componentVNode.set(component, vNode)
          if (component.slots.length === 1) {
            setEditable(vNode, null)
          } else {
            setEditable(vNode, false)
          }
        }
        (oldVNode.parentNode as VElement).replaceChild(vNode, oldVNode)
        const oldNativeNode = this.nativeNodeCaches.get(oldVNode)
        const newNativeNode = this.diffAndUpdate(vNode, oldVNode)
        this.nativeNodeCaches.set(newNativeNode, vNode)
        this.slotVNodeCaches.set(slot, vNode)
        if (oldNativeNode !== newNativeNode) {
          this.nativeRenderer.replace(newNativeNode, oldNativeNode)
        }
      }
    })
    component.changeMarker.rendered()
    return this.componentVNode.get(component)!
  }

  private slotRender(slot: Slot, slotRenderFactory: () => VElement): VElement {
    if (slot.changeMarker.dirty) {
      this.slotRenderFactory.set(slot, slotRenderFactory)
      const root = slotRenderFactory()
      root.attrs.set(this.slotIdAttrKey, slot.id)
      let host = root
      setEditable(host, true)
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

      this.vNodeLocation.set(root, {
        slot: slot,
        startIndex: 0,
        endIndex: slot.length
      })
      slot.changeMarker.rendered()
      this.slotVNodeCaches.set(slot, root)
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
        const newNativeNode = this.diffAndUpdate(vNode, oldVNode)
        // this.componentRefVNode.set(componentRef, vNode)
        if (oldNativeNode !== newNativeNode) {
          this.nativeRenderer.replace(newNativeNode, oldNativeNode)
        }
      }
    })
    slot.changeMarker.rendered()
    return this.slotVNodeCaches.get(slot)!
  }

  // private componentRender(component: Component): VElement {
  //   if (component.marker.dirty) {
  //     Promise.resolve().then(() => {
  //       invokeListener(component, 'onViewChecked')
  //     })
  //     const node = component.instance.render(false, (slot, factory) => {
  //       return this.slotRender(slot, factory)
  //     })
  //     component.marker.rendered()
  //     this.componentVNode.set(component, node)
  //     return node
  //   }
  //   component.slots.toArray().forEach(slot => {
  //     if (slot.marker.changed) {
  //       slot.sliceContent().filter((i): i is Component => {
  //         return typeof i !== 'string'
  //       }).forEach(component => {
  //         this.componentRender(component)
  //       })
  //     }
  //   })
  //   component.marker.rendered()
  //   return this.componentVNode.get(component)!
  // }
  //
  // private slotRender(slot: Slot, hostFactory: () => VElement): VElement {
  //   const root = hostFactory()
  //   root.attrs.set(this.slotIdAttrKey, slot.id)
  //   let host = root
  //   // host.attrs.set('textbus-editable', 'on')
  //   const formatTree = slot.createFormatTree()
  //   if (formatTree.formats) {
  //     host = this.createVDomByOverlapFormats(Renderer.formatSort(formatTree.formats), root, slot)
  //   }
  //   if (formatTree.children) {
  //     const children = this.createVDomByFormatTree(slot, formatTree.children)
  //     host.appendChild(...children)
  //   } else {
  //     host.appendChild(...this.createVDomByContent(slot, formatTree.startIndex, formatTree.endIndex))
  //   }
  //
  //   this.vNodeMetadata.set(root, {
  //     slot,
  //     startIndex: 0,
  //     endIndex: slot.length
  //   })
  //   slot.marker.rendered()
  //   this.slotRefVNode.set(slot, root)
  //   return root
  // }

  private createVDomByFormatTree(slot: Slot, formats: FormatTree[]) {
    const children: Array<VElement | VTextNode> = []
    formats.map(child => {
      if (child.formats) {
        const elements: VElement[] = []
        const formats = formatSort(child.formats)
        let host: VElement = null as any
        formats.forEach(item => {
          const node = item.formatter.render(host, item.value, false)
          if (node && host !== node) {
            this.vNodeLocation.set(node, {
              slot,
              startIndex: item.startIndex,
              endIndex: item.endIndex
            })
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
      const next = item.formatter.render(host, item.value, false)
      if (next && next !== host) {
        host.appendChild(next)
        host = next
        this.vNodeLocation.set(next, {
          slot,
          startIndex: 0,
          endIndex: slot.length
        })
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
        if (value) {
          (value as Ref<any>).current = el
        }
        return
      }
      if (value === false) {
        return
      }
      if (value === true) {
        el[key] = true
        return
      }
      el.setAttribute(key, value + '')
    })
    vDom.styles.forEach((value, key) => {
      el.style[key] = value
    })
    vDom.classes.forEach(k => el.classList.add(k))

    Object.keys(vDom.listeners).forEach(type => {
      this.nativeRenderer.listen(el, type, vDom.listeners[type])
    })

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
