import { fromEvent, Observable, Subject, Subscription } from '@tanbo/stream'
import { Inject, Injectable } from '@tanbo/di'
import {
  ComponentInstance,
  NativeSelectionBridge,
  NativeSelectionConnector,
  Renderer, SelectionPosition,
  Slot,
  Range as TBRange,
  VElement,
  VNodeLocation,
  VTextNode, RootComponentRef
} from '@textbus/core'

import { Caret, getLayoutRectByRange } from './caret'
import { DOC_CONTAINER, EDITABLE_DOCUMENT, EDITOR_MASK } from './injection-tokens'
import { createElement } from '../_utils/uikit'
import { Input } from './input'

/**
 * Textbus PC 端选区桥接实现
 */
@Injectable()
export class SelectionBridge implements NativeSelectionBridge {
  onSelectionChange: Observable<Range | null>
  nativeSelection = this.document.getSelection()!

  private selectionMaskElement = createElement('style')

  private selectionChangeEvent = new Subject<Range | null>()

  private subs: Subscription[] = []
  private sub: Subscription
  private connector: NativeSelectionConnector | null = null

  constructor(@Inject(EDITABLE_DOCUMENT) private document: Document,
              @Inject(DOC_CONTAINER) private docContainer: HTMLElement,
              @Inject(EDITOR_MASK) private maskContainer: HTMLElement,
              public caret: Caret,
              private rootComponentRef: RootComponentRef,
              private input: Input,
              private renderer: Renderer) {
    this.onSelectionChange = this.selectionChangeEvent.asObservable()
    this.showNativeMask()
    this.document.head.appendChild(this.selectionMaskElement)
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
    const position = this.getPositionByRange({
      startOffset: location.offset,
      endOffset: location.offset,
      startSlot: location.slot,
      endSlot: location.slot
    })
    if (!position.start || !position.end) {
      return null
    }
    const node = position.start.node
    const offset = position.start.offset
    const nativeRange = this.document.createRange()
    nativeRange.setStart(node, offset)
    nativeRange.collapse()
    return getLayoutRectByRange(nativeRange)
  }

  restore(range: TBRange | null) {
    this.unListen()
    if (!this.connector) {
      return
    }
    if (!range) {
      this.nativeSelection.removeAllRanges()
      this.selectionChangeEvent.next(null)
      this.listen(this.connector)
      return
    }

    const position = this.getPositionByRange(range)
    if (!position.start || !position.end) {
      this.nativeSelection.removeAllRanges()
      this.selectionChangeEvent.next(null)
      this.listen(this.connector)
      return
    }

    let nativeRange: Range
    if (this.nativeSelection.rangeCount) {
      nativeRange = this.nativeSelection.getRangeAt(0)
    } else {
      nativeRange = this.document.createRange()
      this.nativeSelection.addRange(nativeRange)
    }
    nativeRange.setStart(position.start!.node, position.start!.offset)
    nativeRange.setEnd(position.end!.node, position.end!.offset)
    if (nativeRange.collapsed) {
      // 防止结束位置在起始位置前
      nativeRange.setEnd(position.start!.node, position.start!.offset)
      nativeRange.setStart(position.end!.node, position.end!.offset)
    }
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
    let start!: { node: Node, offset: number } | null
    let end!: { node: Node, offset: number } | null
    try {
      start = this.findFocusNodeAndOffset(range.startSlot!, range.startOffset!)
      end = start
      if (range.endSlot !== range.startSlot || range.endOffset !== range.startOffset) {
        end = this.findFocusNodeAndOffset(range.endSlot!, range.endOffset!)
      }
      return {
        start,
        end
      }
    } catch (e) {
      return {
        start: null,
        end: null
      }
    }
  }

  private findFocusNodeAndOffset(slot: Slot, offset: number): { node: Node, offset: number } | null {
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
    let isFocusin = false
    this.subs.push(
      fromEvent(this.docContainer, 'focusin').subscribe(() => {
        isFocusin = true
      }),
      fromEvent(this.docContainer, 'focusout').subscribe(() => {
        isFocusin = false
      }),
      fromEvent<MouseEvent>(this.docContainer, 'mousedown').subscribe(ev => {
        if (ev.button === 2) {
          return
        }
        selection.removeAllRanges()
        // const path = ev.composedPath()
        // while (path.length) {
        //   const first = path.shift() as HTMLElement
        //   if (first.nodeType === Node.ELEMENT_NODE) {
        //     const location = this.renderer.getLocationByNativeNode(first)
        //     if (location) {
        //       const editableState = first.getAttribute('textbus-editable')
        //       if (editableState === 'on') {
        //         return
        //       }
        //       if (editableState === 'off') {
        //         const parentNode = first.parentNode!
        //         const index = Array.from(parentNode.childNodes).indexOf(first)
        //         selection.setPosition(parentNode, index + 1)
        //         return
        //       }
        //     }
        //   }
        // }
      }),
      fromEvent(this.document, 'selectionchange').subscribe(() => {
        if (isFocusin) {
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
        const startFocusNode = this.findFocusNode(nativeRange.startContainer, isFocusStart)
        const endFocusNode = this.findFocusNode(nativeRange.endContainer, isFocusStart)
        if (!startFocusNode || !endFocusNode || !startFocusNode.parentNode || !endFocusNode.parentNode) {
          connector.setSelection(null)
          return
        }

        if (startFocusNode !== nativeRange.startContainer) {
          if (startFocusNode.nodeType === Node.TEXT_NODE) {
            nativeRange.setStart(startFocusNode, 0)
          } else {
            const parentNode = startFocusNode.parentNode
            const offset = startFocusNode.nodeName.toLowerCase() === 'br' && startFocusNode === parentNode.lastChild ? 0 : 1
            nativeRange.setStart(parentNode,
              Array.from(parentNode.childNodes).indexOf(startFocusNode as ChildNode) + offset)
          }
        }
        if (endFocusNode !== nativeRange.endContainer) {
          if (endFocusNode.nodeType === Node.TEXT_NODE) {
            nativeRange.setEnd(endFocusNode, 0)
          } else {
            const parentNode = endFocusNode.parentNode
            const offset = startFocusNode.nodeName.toLowerCase() === 'br' && startFocusNode === parentNode.lastChild ? 0 : 1
            nativeRange.setEnd(parentNode,
              Array.from(parentNode.childNodes).indexOf(endFocusNode as ChildNode) + offset)
          }
        }

        const startPosition = this.renderer.getLocationByNativeNode(nativeRange.startContainer as any)
        const endPosition = this.renderer.getLocationByNativeNode(nativeRange.endContainer as any)
        if ([Node.ELEMENT_NODE, Node.TEXT_NODE].includes(nativeRange.commonAncestorContainer?.nodeType) &&
          startPosition && endPosition) {
          const start = this.findPosition(nativeRange.startContainer, nativeRange.startOffset, startPosition)
          const end = this.findPosition(nativeRange.endContainer, nativeRange.endOffset, endPosition)
          if (start && end) {
            connector.setSelection({
              startSlot: start.slot,
              startOffset: start.index,
              endSlot: end.slot,
              endOffset: end.index
            }, isFocusEnd)
            this.selectionChangeEvent.next(nativeRange)
            return
          }
        }
        connector.setSelection(null)
      })
    )
  }

  private findFocusNode(node: Node, toAfter = false, excludeNodes: Node[] = []): Node | null {
    if (excludeNodes.includes(node)) {
      const next = (toAfter ? node.nextSibling : node.previousSibling) || node.parentNode
      if (next) {
        return this.findFocusNode(next, toAfter, excludeNodes)
      }
      return null
    }
    excludeNodes.push(node)
    const position = this.renderer.getLocationByNativeNode(node as any)
    if (!position) {
      const firstChild = toAfter ? node.firstChild : node.lastChild
      if (firstChild) {
        return this.findFocusNode(firstChild, toAfter, excludeNodes)
      }
      const nextSibling = toAfter ? node.nextSibling : node.previousSibling
      if (nextSibling) {
        return this.findFocusNode(nextSibling, toAfter, excludeNodes)
      }
      const parentNode = node.parentNode
      if (parentNode) {
        return this.findFocusNode(parentNode, toAfter, excludeNodes)
      }
      return null
    }
    if (this.renderer.getVNodeBySlot(position.slot) === this.renderer.getVNodeByNativeNode(node)) {
      return toAfter ? node.firstChild : node.lastChild
    }
    return node
  }

  private findPosition(container: Node,
                       offset: number,
                       position: VNodeLocation): { slot: Slot, index: number } | null {
    if (container.nodeType === Node.TEXT_NODE) {
      return {
        slot: position.slot,
        index: position.startIndex + offset
      }
    } else if (container.nodeType === Node.ELEMENT_NODE) {
      const childNodes = container.childNodes
      if (childNodes.length === 0) {
        return null
      }
      if (childNodes.length === offset) {
        const child = childNodes[childNodes.length - 1]
        const childPosition = this.renderer.getLocationByNativeNode(child as any)
        if (!childPosition) {
          return null
        }
        return {
          slot: childPosition.slot,
          index: childPosition.endIndex
        }
      } else {
        const child = childNodes[offset]
        const childPosition = this.renderer.getLocationByNativeNode(child as any)
        if (!childPosition) {
          return null
        }
        return {
          slot: childPosition.slot,
          index: childPosition.startIndex
        }
      }
    }
    return null
  }
}
