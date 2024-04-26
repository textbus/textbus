import { filter, fromEvent, Observable, Subject, Subscription } from '@tanbo/stream'
import { Inject, Injectable, Injector } from '@tanbo/di'
import {
  NativeSelectionBridge,
  NativeSelectionConnector,
  Renderer,
  SelectionPosition,
  Slot,
  AbstractSelection,
  RootComponentRef,
  Controller,
  VElement,
  VTextNode,
  Selection
} from '@textbus/core'

import { EDITOR_OPTIONS, VIEW_DOCUMENT, VIEW_MASK } from './injection-tokens'
import { createElement, getLayoutRectByRange, Rect } from '../_utils/uikit'
import { Input, ViewOptions } from './types'

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

  private ignoreSelectionChange = false

  private changeFromUser = false
  private docContainer: HTMLElement
  private maskContainer: HTMLElement

  private cacheCaretPositionTimer!: any
  private oldCaretPosition!: Rect | null

  constructor(@Inject(EDITOR_OPTIONS) private config: ViewOptions,
              private injector: Injector,
              private controller: Controller,
              private selection: Selection,
              private rootComponentRef: RootComponentRef,
              private input: Input,
              private renderer: Renderer) {
    this.docContainer = injector.get(VIEW_DOCUMENT)
    this.maskContainer = injector.get(VIEW_MASK)
    this.onSelectionChange = this.selectionChangeEvent.asObservable().pipe(filter(() => {
      return !controller.readonly
    }))
    document.head.appendChild(this.selectionMaskElement)
    this.sub = this.onSelectionChange.subscribe((r) => {
      if (r) {
        input.focus(r, this.changeFromUser)
      } else {
        input.blur()
      }
    })
    this.sub.add(
      fromEvent(document, 'focusin').subscribe(ev => {
        let target = ev.target as HTMLElement
        if (/^(input|textarea|select)$/i.test(target.nodeName)) {
          if (target.tagName.toLowerCase() === 'input' && /^(range|date)$/.test((target as HTMLInputElement).type)) {
            return
          }
          this.ignoreSelectionChange = true
          return
        }
        if (!config.useContentEditable) {
          while (target) {
            if (target.contentEditable === 'true') {
              this.ignoreSelectionChange = true
              return
            }
            target = target.parentNode as HTMLElement
          }
        }
      })
    )
    this.sub.add(
      fromEvent(document, 'focusout').subscribe(() => {
        this.ignoreSelectionChange = false
      })
    )
  }

  connect(connector: NativeSelectionConnector) {
    this.disConnect()
    this.connector = connector
    this.syncSelection(connector)
    this.listen(connector)
  }

  disConnect() {
    this.connector = null
    this.unListen()
  }

  getRect(location: SelectionPosition) {
    const { focus, anchor } = this.getPositionByRange({
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

  restore(abstractSelection: AbstractSelection | null, formLocal: boolean) {
    this.changeFromUser = formLocal
    if (this.ignoreSelectionChange || !this.connector) {
      return
    }
    this.unListen()
    if (!abstractSelection) {
      this.nativeSelection.removeAllRanges()
      this.selectionChangeEvent.next(null)
      this.listen(this.connector)
      return
    }

    const { focus, anchor } = this.getPositionByRange(abstractSelection)
    if (!focus || !anchor) {
      this.nativeSelection.removeAllRanges()
      this.selectionChangeEvent.next(null)
      this.listen(this.connector)
      return
    }

    function tryOffset(position: {node: Node, offset: number}) {
      if (position.node.nodeType === Node.TEXT_NODE) {
        const len = position.node.textContent!.length
        if (position.offset > len) {
          position.offset = len
        }
      } else if (position.node.nodeType === Node.ELEMENT_NODE) {
        const len = position.node.childNodes.length
        if (position.offset > len) {
          position.offset = len
        }
      }
    }

    tryOffset(focus)
    tryOffset(anchor)

    try {
      this.nativeSelection.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset)
    } catch (e) {
      setTimeout(() => {
        throw e
      })
    }
    if (this.nativeSelection.rangeCount) {
      const nativeRange = this.nativeSelection.getRangeAt(0)
      this.selectionChangeEvent.next(nativeRange)
    } else {
      this.selectionChangeEvent.next(null)
    }

    // hack start 浏览器会触发上面选区更改事件
    const bind = () => {
      if (this.connector) {
        this.listen(this.connector)
      }
    }
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(bind)
    } else {
      setTimeout(bind, 30)
    }
    // hack end
  }

  destroy() {
    this.sub.unsubscribe()
  }

  getPositionByRange(abstractSelection: AbstractSelection) {
    let focus!: {node: Node, offset: number} | null
    let anchor!: {node: Node, offset: number} | null
    try {
      focus = this.findSelectedNodeAndOffset(abstractSelection.focusSlot!, abstractSelection.focusOffset!)
      anchor = focus
      if (abstractSelection.anchorSlot !== abstractSelection.focusSlot ||
        abstractSelection.anchorOffset !== abstractSelection.focusOffset) {
        anchor = this.findSelectedNodeAndOffset(abstractSelection.anchorSlot!, abstractSelection.anchorOffset!)
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

  getPreviousLinePositionByCurrent(position: SelectionPosition): SelectionPosition | null {
    return this.getLinePosition(position, false)
  }

  getNextLinePositionByCurrent(position: SelectionPosition): SelectionPosition | null {
    return this.getLinePosition(position, true)
  }

  private getLinePosition(currentPosition: SelectionPosition, toNext: boolean): SelectionPosition | null {
    clearTimeout(this.cacheCaretPositionTimer)
    let p: SelectionPosition
    if (this.oldCaretPosition) {
      p = toNext ?
        this.getNextLinePositionByOffset(currentPosition, this.oldCaretPosition.left) :
        this.getPreviousLinePositionByOffset(currentPosition, this.oldCaretPosition.left)
    } else {
      this.oldCaretPosition = this.getRect(currentPosition)!
      p = toNext ?
        this.getNextLinePositionByOffset(currentPosition, this.oldCaretPosition.left) :
        this.getPreviousLinePositionByOffset(currentPosition, this.oldCaretPosition.left)
    }
    this.cacheCaretPositionTimer = setTimeout(() => {
      this.oldCaretPosition = null
    }, 3000)
    return p
  }

  /**
   * 获取选区向上移动一行的位置。
   * @param currentPosition
   * @param startLeft 参考位置。
   */
  private getPreviousLinePositionByOffset(currentPosition: SelectionPosition, startLeft: number): SelectionPosition {
    let isToPrevLine = false
    let loopCount = 0
    let minLeft = startLeft
    let focusSlot = currentPosition.slot
    let focusOffset = currentPosition.offset
    let minTop = this.getRect({
      slot: focusSlot,
      offset: focusOffset
    })!.top

    let position: SelectionPosition
    let oldPosition!: SelectionPosition
    let oldLeft = 0
    while (true) {
      loopCount++
      position = this.selection.getPreviousPositionByPosition(focusSlot, focusOffset)
      focusSlot = position.slot
      focusOffset = position.offset
      const rect2 = this.getRect(position)!
      if (!isToPrevLine) {
        if (rect2.left > minLeft || rect2.top + rect2.height <= minTop) {
          isToPrevLine = true
        } else if (rect2.left === minLeft && rect2.top === minTop) {
          return position
        }
        minLeft = rect2.left
        minTop = rect2.top
        oldPosition = position
      }
      if (isToPrevLine) {
        if (rect2.left < startLeft) {
          return position
        }
        if (oldPosition) {
          if (rect2.left >= oldLeft) {
            return oldPosition
          }
        }
        oldLeft = rect2.left
        oldPosition = position
      }
      if (loopCount > 10000) {
        break
      }
    }
    return position || {
      offset: 0,
      slot: focusSlot
    }
  }

  /**
   * 获取选区向下移动一行的位置。
   * @param currentPosition
   * @param startLeft 参考位置。
   */
  private getNextLinePositionByOffset(currentPosition: SelectionPosition, startLeft: number): SelectionPosition {
    let isToNextLine = false
    let loopCount = 0
    let maxRight = startLeft
    let focusSlot = currentPosition.slot
    let focusOffset = currentPosition.offset
    const rect = this.getRect({
      slot: focusSlot,
      offset: focusOffset
    })!
    let minTop = rect.top
    let oldPosition!: SelectionPosition
    let oldLeft = 0
    while (true) {
      loopCount++
      const position = this.selection.getNextPositionByPosition(focusSlot, focusOffset)
      focusSlot = position.slot
      focusOffset = position.offset
      const rect2 = this.getRect(position)!
      if (!isToNextLine) {
        if (rect2.left < maxRight || rect2.top >= minTop + rect.height) {
          isToNextLine = true
        } else if (rect2.left === maxRight && rect2.top === minTop) {
          return position
        }
        maxRight = rect2.left
        minTop = rect2.top
        oldPosition = position
      }
      if (isToNextLine) {
        if (rect2.left > startLeft) {
          return oldPosition
        }
        if (oldPosition) {
          if (rect2.left <= oldLeft) {
            return oldPosition
          }
        }
        oldPosition = position
        oldLeft = rect2.left
      }
      if (loopCount > 10000) {
        break
      }
    }
    return oldPosition || {
      offset: focusSlot.length,
      slot: focusSlot
    }
  }

  private unListen() {
    this.subs.forEach(i => i.unsubscribe())
    this.subs = []
  }

  private listen(connector: NativeSelectionConnector) {
    if (!this.config.useContentEditable) {
      const selection = this.nativeSelection
      this.subs.push(
        fromEvent<MouseEvent>(this.docContainer, 'mousedown').subscribe(ev => {
          if (this.ignoreSelectionChange || ev.button === 2) {
            return
          }
          if (!ev.shiftKey) {
            selection.removeAllRanges()
          }
        })
      )
    }
    this.subs.push(
      fromEvent(document, 'selectionchange').pipe().subscribe(() => {
        this.syncSelection(connector)
      })
    )
  }

  private syncSelection(connector: NativeSelectionConnector) {
    const selection = this.nativeSelection
    this.changeFromUser = true
    if (this.ignoreSelectionChange ||
      this.input.composition ||
      selection.rangeCount === 0 ||
      !this.docContainer.contains(selection.anchorNode) ||
      this.rootComponentRef.component.slots.length === 0) {
      return
    }
    const rawRange = selection.getRangeAt(0)
    const nativeRange = rawRange.cloneRange()
    const isFocusEnd = selection.focusNode === nativeRange.endContainer && selection.focusOffset === nativeRange.endOffset
    const isFocusStart = selection.focusNode === nativeRange.startContainer && selection.focusOffset === nativeRange.startOffset
    if (!this.docContainer.contains(selection.focusNode)) {
      if (isFocusEnd) {
        const vEle = this.renderer.getVNodeBySlot(this.rootComponentRef.component.slots.first!)
        if (!vEle) {
          return
        }
        const nativeNode = this.renderer.getNativeNodeByVNode(vEle)
        if (!nativeNode) {
          return
        }
        nativeRange.setEndAfter(nativeNode.lastChild!)
      } else {
        const vEle = this.renderer.getVNodeBySlot(this.rootComponentRef.component.slots.last!)
        if (!vEle) {
          return
        }
        const nativeNode = this.renderer.getNativeNodeByVNode(vEle)
        if (!nativeNode) {
          return
        }
        nativeRange.setStartBefore(nativeNode.firstChild!)
      }
    }

    const startPosition = this.getCorrectedPosition(nativeRange.startContainer, nativeRange.startOffset, isFocusStart)
    const endPosition = nativeRange.collapsed ?
      startPosition :
      this.getCorrectedPosition(nativeRange.endContainer, nativeRange.endOffset, isFocusEnd)

    if ([Node.ELEMENT_NODE, Node.TEXT_NODE].includes(nativeRange.commonAncestorContainer?.nodeType) &&
      startPosition && endPosition) {
      const abstractSelection: AbstractSelection = isFocusEnd ? {
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
      const { focus, anchor } = this.getPositionByRange(abstractSelection)
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
        connector.setSelection(abstractSelection)
        if (selection.isCollapsed && (
          rawRange.startContainer !== start.node ||
          rawRange.startOffset !== start.offset ||
          rawRange.endContainer !== end.node ||
          rawRange.endOffset !== end.offset
        )) {
          rawRange.setStart(start.node, start.offset)
          rawRange.setEnd(end.node, end.offset)
        }
        this.selectionChangeEvent.next(nativeRange)
      } else {
        connector.setSelection(null)
      }
      return
    }
    connector.setSelection(null)
  }

  private findSelectedNodeAndOffset(slot: Slot, offset: number): {node: Node, offset: number} | null {
    const prev = slot.getContentAtIndex(offset - 1)
    const vNodes = this.renderer.getVNodesBySlot(slot)

    if (prev) {
      if (typeof prev !== 'string') {
        const vNode = this.renderer.getVNodeByComponent(prev)!
        const nativeNode = this.renderer.getNativeNodeByVNode(vNode)
        return {
          node: nativeNode.parentNode,
          offset: Array.from(nativeNode.parentNode!.childNodes).indexOf(nativeNode) + 1
        }
      } else if (prev === '\n') {
        for (const vNode of vNodes) {
          if (vNode instanceof VTextNode) {
            continue
          }
          if (vNode.tagName === 'br') {
            const position = this.renderer.getLocationByVNode(vNode)
            if (position) {
              if (position.endIndex === offset) {
                const nativeNode = this.renderer.getNativeNodeByVNode(vNode)!
                const parentNode = nativeNode.parentNode!
                return {
                  node: parentNode,
                  offset: Array.from(parentNode.childNodes).indexOf(nativeNode) + 1
                }
              }
            }
          }
        }
      }
    }
    const current = slot.getContentAtIndex(offset)
    if (current && typeof current !== 'string') {
      const vNode = this.renderer.getVNodeByComponent(current)!
      const nativeNode = this.renderer.getNativeNodeByVNode(vNode)
      return {
        node: nativeNode.parentNode,
        offset: Array.from(nativeNode.parentNode!.childNodes).indexOf(nativeNode)
      }
    }
    for (const vNode of vNodes) {
      if (vNode instanceof VElement) {
        if (vNode.tagName === 'br') {
          const position = this.renderer.getLocationByVNode(vNode)
          if (position) {
            if (position.startIndex === offset) {
              const nativeNode = this.renderer.getNativeNodeByVNode(vNode)!
              const parentNode = nativeNode.parentNode!
              return {
                node: parentNode,
                offset: Array.from(parentNode.childNodes).indexOf(nativeNode)
              }
            }
          }
        }
        continue
      }
      const position = this.renderer.getLocationByVNode(vNode)
      if (position) {
        if (offset >= position.startIndex && offset <= position.endIndex) {
          const nativeNode = this.renderer.getNativeNodeByVNode(vNode)!
          return {
            node: nativeNode,
            offset: offset - position.startIndex
          }
        }
      }
    }
    return null
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
