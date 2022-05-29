import { fromEvent, Observable, Subject, Subscription } from '@tanbo/stream'
import { Inject, Injectable } from '@tanbo/di'
import {
  ComponentInstance,
  NativeSelectionBridge,
  NativeSelectionConnector,
  Renderer,
  SelectionPosition,
  Slot,
  Range as TBRange,
  VElement,
  VTextNode,
  RootComponentRef
} from '@textbus/core'

import { Caret, getLayoutRectByRange } from './caret'
import { DOC_CONTAINER, EDITOR_MASK } from './injection-tokens'
import { createElement } from '../_utils/uikit'
import { Input } from './input'

/**
 * Textbus PC 端选区桥接实现
 */
@Injectable()
export class SelectionBridge implements NativeSelectionBridge {
  onSelectionChange: Observable<Range | null>
  nativeSelection = document.getSelection()!

  private selectionMaskElement = createElement('style')

  private selectionChangeEvent = new Subject<Range | null>()

  private subs: Subscription[] = []
  private sub: Subscription
  private connector: NativeSelectionConnector | null = null

  private isFocusIn = false

  constructor(@Inject(DOC_CONTAINER) private docContainer: HTMLElement,
              @Inject(EDITOR_MASK) private maskContainer: HTMLElement,
              public caret: Caret,
              private rootComponentRef: RootComponentRef,
              private input: Input,
              private renderer: Renderer) {
    this.onSelectionChange = this.selectionChangeEvent.asObservable()
    this.showNativeMask()
    document.head.appendChild(this.selectionMaskElement)
    this.sub = this.onSelectionChange.subscribe((r) => {
      if (r) {
        this.caret.show(r)
      } else {
        this.caret.hide()
      }
      if (r) {
        input.focus()
      } else {
        input.blur()
      }
    })
  }

  showNativeMask() {
    this.selectionMaskElement.innerHTML = `#${this.docContainer.id} *::selection{background-color: rgba(18, 150, 219, .2)}`
  }

  hideNativeMask() {
    this.selectionMaskElement.innerHTML = `#${this.docContainer.id} *::selection{background-color: transparent}`
  }

  connect(connector: NativeSelectionConnector) {
    this.connector = connector
    this.listen(connector)
  }

  disConnect() {
    this.connector = null
    this.unListen()
  }

  getRect(location: SelectionPosition) {
    const {focus, anchor} = this.getPositionByRange({
      focusOffset: location.offset,
      anchorOffset: location.offset,
      focusSlot: location.slot,
      anchorSlot: location.slot
    })
    if (!focus || !anchor) {
      return null
    }
    const nativeRange = document.createRange()
    nativeRange.setStart(focus.node, focus.offset)
    nativeRange.collapse()
    return getLayoutRectByRange(nativeRange)
  }

  restore(range: TBRange | null) {
    this.unListen()
    if (!this.connector) {
      return
    }
    if (!range) {
      if (!this.isFocusIn) {
        this.nativeSelection.removeAllRanges()
      }
      this.isFocusIn = false
      this.selectionChangeEvent.next(null)
      this.listen(this.connector)
      return
    }

    const {focus, anchor} = this.getPositionByRange(range)
    if (!focus || !anchor) {
      this.nativeSelection.removeAllRanges()
      this.selectionChangeEvent.next(null)
      this.listen(this.connector)
      return
    }

    this.nativeSelection.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset)
    const nativeRange = this.nativeSelection.getRangeAt(0)
    this.selectionChangeEvent.next(nativeRange)
    setTimeout(() => {
      // hack 浏览器会触发上面选区更改事件
      if (this.connector) {
        this.listen(this.connector)
      }
    })
  }

  destroy() {
    this.caret.destroy()
    this.sub.unsubscribe()
  }

  getPositionByRange(range: TBRange) {
    let focus!: { node: Node, offset: number } | null
    let anchor!: { node: Node, offset: number } | null
    try {
      focus = this.findSelectedNodeAndOffset(range.focusSlot!, range.focusOffset!)
      anchor = focus
      if (range.anchorSlot !== range.focusSlot || range.anchorOffset !== range.focusOffset) {
        anchor = this.findSelectedNodeAndOffset(range.anchorSlot!, range.anchorOffset!)
      }
      return {
        focus,
        anchor
      }
    } catch (e) {
      return {
        focus: null,
        anchor: null
      }
    }
  }

  private findSelectedNodeAndOffset(slot: Slot, offset: number): { node: Node, offset: number } | null {
    const vElement = this.renderer.getVNodeBySlot(slot)!
    if (offset >= slot.length) {
      const container = this.renderer.getNativeNodeByVNode(vElement) as Element
      const lastChild = container.lastChild!
      if (lastChild.nodeType === Node.TEXT_NODE) {
        return {
          node: lastChild,
          offset: lastChild.textContent!.length
        }
      }
    }

    const current = slot.getContentAtIndex(offset)
    const prev = slot.getContentAtIndex(offset - 1)

    if (current === '\n') {
      if (typeof prev === 'string' && prev !== '\n') {
        return this.findFocusNativeTextNode(vElement, offset, true)
      }
      return this.deepFindNativeNodeByOffset(slot, vElement, offset)
    }
    if (typeof current === 'string') {
      return this.findFocusNativeTextNode(vElement, offset, typeof prev === 'string' && prev !== '\n')
    }
    if (prev === '\n') {
      for (const component of slot.sliceContent().filter((i): i is ComponentInstance => {
        return typeof i !== 'string'
      })) {
        if (component === current) {
          const vNode = this.renderer.getVNodeByComponent(component)!
          const nativeNode = this.renderer.getNativeNodeByVNode(vNode) as any
          return {
            node: nativeNode.parentNode!,
            offset: Array.from(nativeNode.parentNode!.childNodes).indexOf(nativeNode)
          }
        }
      }
    }
    if (typeof prev === 'string') {
      return this.findFocusNativeTextNode(vElement, offset, true)
    }
    if (typeof prev === 'undefined') {
      const vNode = this.renderer.getVNodeByComponent(current)!
      const nativeNode = this.renderer.getNativeNodeByVNode(vNode)
      return {
        node: nativeNode.parentNode!,
        offset: Array.from(nativeNode.parentNode!.childNodes).indexOf(nativeNode)
      }
    }
    const vNode = this.renderer.getVNodeByComponent(prev)!
    const nativeNode = this.renderer.getNativeNodeByVNode(vNode)!
    return {
      node: nativeNode.parentNode,
      offset: Array.from(nativeNode.parentNode!.childNodes).indexOf(nativeNode) + 1
    }
    // return this.deepFindNativeNodeByOffset(slot, vElement, offset)
  }

  private findFocusNativeTextNode(vElement: VElement,
                                  offset: number,
                                  toLeft: boolean): { node: Node, offset: number } | null {
    for (const item of vElement.children) {
      const position = this.renderer.getLocationByVNode(item)!
      if (toLeft ? position.endIndex < offset : position.endIndex <= offset) {
        continue
      }
      if (item instanceof VTextNode) {
        return {
          node: this.renderer.getNativeNodeByVNode(item),
          offset: offset - position.startIndex
        }
      }
      return this.findFocusNativeTextNode(item, offset, toLeft)
    }
    return null
  }

  private deepFindNativeNodeByOffset(source: Slot,
                                     root: VElement,
                                     offset: number): { node: Node, offset: number } | null {
    for (const item of root.children) {
      const position = this.renderer.getLocationByVNode(item)!
      if (position.slot !== source) {
        return null
      }
      if (position.endIndex <= offset) {
        continue
      }
      if (item instanceof VElement) {
        if (position.startIndex === offset && position.endIndex === offset + 1) {
          const position = this.deepFindNativeNodeByOffset(source, item, offset)
          if (position) {
            return position
          }
          const node = this.renderer.getNativeNodeByVNode(item)
          const parent = node.parentNode
          return {
            node: parent,
            offset: Array.from(parent.childNodes).indexOf(node as ChildNode)
          }
        }
        return this.deepFindNativeNodeByOffset(source, item, offset)
      }
    }
    return null
  }

  private unListen() {
    this.subs.forEach(i => i.unsubscribe())
    this.subs = []
  }

  private listen(connector: NativeSelectionConnector) {
    const selection = this.nativeSelection
    this.isFocusIn = false
    this.subs.push(
      fromEvent(document, 'focusin').subscribe(() => {
        this.isFocusIn = true
      }),
      fromEvent(document, 'focusout').subscribe(() => {
        this.isFocusIn = false
      }),
      fromEvent<MouseEvent>(this.docContainer, 'mousedown').subscribe(ev => {
        if (ev.button === 2) {
          return
        }
        selection.removeAllRanges()
      }),
      fromEvent(document, 'selectionchange').subscribe(() => {
        if (this.isFocusIn) {
          this.isFocusIn = false
          connector.setSelection(null)
          return
        }
        if (selection.rangeCount === 0 ||
          !this.docContainer.contains(selection.anchorNode)) {
          return
        }
        const nativeRange = selection.getRangeAt(0).cloneRange()
        const isFocusEnd = selection.focusNode === nativeRange.endContainer && selection.focusOffset === nativeRange.endOffset
        const isFocusStart = selection.focusNode === nativeRange.startContainer && selection.focusOffset === nativeRange.startOffset
        if (!this.docContainer.contains(selection.focusNode)) {
          if (isFocusEnd) {
            const vEle = this.renderer.getVNodeBySlot(this.rootComponentRef.component.slots.first!)!
            const nativeNode = this.renderer.getNativeNodeByVNode(vEle)
            nativeRange.setEndAfter(nativeNode.lastChild!)
          } else {
            const vEle = this.renderer.getVNodeBySlot(this.rootComponentRef.component.slots.last!)!
            const nativeNode = this.renderer.getNativeNodeByVNode(vEle)
            nativeRange.setStartBefore(nativeNode.firstChild!)
          }
        }

        const startPosition = this.getCorrectedPosition(nativeRange.startContainer, nativeRange.startOffset, isFocusStart)
        const endPosition = nativeRange.collapsed ? startPosition : this.getCorrectedPosition(nativeRange.endContainer, nativeRange.endOffset, isFocusEnd)
        if ([Node.ELEMENT_NODE, Node.TEXT_NODE].includes(nativeRange.commonAncestorContainer?.nodeType) &&
          startPosition && endPosition) {
          const range: TBRange = isFocusEnd ? {
            anchorSlot: startPosition.slot,
            anchorOffset: startPosition.offset,
            focusSlot: endPosition.slot,
            focusOffset: endPosition.offset
          } : {
            focusSlot: startPosition.slot,
            focusOffset: startPosition.offset,
            anchorSlot: endPosition.slot,
            anchorOffset: endPosition.offset
          }
          const {focus, anchor} = this.getPositionByRange(range)

          if (focus && anchor) {
            let start = anchor
            let end = focus
            if (isFocusStart) {
              start = focus
              end = anchor
            }
            if (nativeRange.startContainer !== start.node || nativeRange.startOffset !== start.offset) {
              nativeRange.setStart(start.node, start.offset)
            }
            if (nativeRange.endContainer !== end.node || nativeRange.endOffset !== end.offset) {
              nativeRange.setEnd(end.node, end.offset)
            }
            connector.setSelection(range)
            this.selectionChangeEvent.next(nativeRange)
          } else {
            connector.setSelection(null)
          }
          return
        }
        connector.setSelection(null)
      })
    )
  }

  private getCorrectedPosition(node: Node, offset: number, toAfter: boolean, excludeNodes: Node[] = []): SelectionPosition | null {
    excludeNodes.push(node)
    if (node.nodeType === Node.ELEMENT_NODE) {
      const containerPosition = this.renderer.getLocationByNativeNode(node)
      const childNode = node.childNodes[offset]
      if (childNode) {
        const childPosition = this.renderer.getLocationByNativeNode(childNode)
        if (childPosition) {
          if (containerPosition) {
            return {
              slot: childPosition.slot,
              offset: childPosition.startIndex
            }
          }
          return this.findFocusNode(childNode, toAfter, excludeNodes)
        }
        return this.findFocusNode(childNode, toAfter, excludeNodes)
      }
      const prevNode = node.childNodes[offset - 1]
      if (prevNode) {
        const prevPosition = this.renderer.getLocationByNativeNode(prevNode)
        if (prevPosition && containerPosition) {
          return {
            slot: prevPosition.slot,
            offset: prevPosition.endIndex
          }
        }
      }
      if (containerPosition) {
        return {
          slot: containerPosition.slot,
          offset: containerPosition.endIndex
        }
      }
      const nextNode = toAfter ? node.nextSibling : node.previousSibling
      if (nextNode) {
        return this.findFocusNode(nextNode, toAfter, excludeNodes)
      }
      return this.findFocusNodeByParent(node, toAfter, excludeNodes)
    } else if (node.nodeType === Node.TEXT_NODE) {
      const containerPosition = this.renderer.getLocationByNativeNode(node)
      if (containerPosition) {
        return {
          slot: containerPosition.slot,
          offset: containerPosition.startIndex + offset
        }
      }
      const nextNode = toAfter ? node.nextSibling : node.previousSibling
      if (nextNode) {
        return this.findFocusNode(nextNode, toAfter, excludeNodes)
      }
      return this.findFocusNodeByParent(node, toAfter, excludeNodes)
    }
    return null
  }

  private findFocusNode(node: Node, toAfter = false, excludeNodes: Node[] = []): SelectionPosition | null {
    if (excludeNodes.includes(node)) {
      const next = toAfter ? node.nextSibling : node.previousSibling
      if (next) {
        return this.findFocusNode(next, toAfter, excludeNodes)
      }
      return this.findFocusNodeByParent(node, toAfter, excludeNodes)
    }
    excludeNodes.push(node)
    const position = this.renderer.getLocationByNativeNode(node as any)
    if (position) {
      return {
        slot: position.slot,
        offset: toAfter ? position.startIndex : position.endIndex
      }
    }
    const firstChild = toAfter ? node.firstChild : node.lastChild
    if (firstChild) {
      return this.findFocusNode(firstChild, toAfter, excludeNodes)
    }
    const nextSibling = toAfter ? node.nextSibling : node.previousSibling
    if (nextSibling) {
      return this.findFocusNode(nextSibling, toAfter, excludeNodes)
    }
    return this.findFocusNodeByParent(node, toAfter, excludeNodes)
  }

  private findFocusNodeByParent(node: Node, toAfter: boolean, excludeNodes: Node[]) {
    const parentNode = node.parentNode
    if (parentNode) {
      const parentPosition = this.renderer.getLocationByNativeNode(parentNode)
      if (parentPosition) {
        return {
          slot: parentPosition.slot,
          offset: toAfter ? parentPosition.endIndex : parentPosition.startIndex
        }
      }
      excludeNodes.push(node)
      return this.findFocusNode(parentNode, toAfter, excludeNodes)
    }
    return null
  }
}
