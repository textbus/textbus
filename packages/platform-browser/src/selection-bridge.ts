import { delay, filter, fromEvent, Observable, Subject, Subscription } from '@tanbo/stream'
import { Inject, Injectable } from '@viewfly/core'
import {
  NativeSelectionBridge,
  NativeSelectionConnector,
  SelectionPosition,
  Slot,
  AbstractSelection,
  RootComponentRef,
  Controller,
  Selection,
  Textbus,
  Scheduler
} from '@textbus/core'

import { EDITOR_OPTIONS, VIEW_DOCUMENT } from './injection-tokens'
import { getLayoutRectByRange, Rect } from './_utils/uikit'
import { Input } from './types'
import type { ViewOptions } from './browser-module'
import { DomAdapter } from './dom-adapter'

/**
 * Textbus PC 端选区桥接实现
 */
@Injectable()
export class SelectionBridge implements NativeSelectionBridge {
  onSelectionChange: Observable<Range | null>
  nativeSelection = document.getSelection()!

  syncSelectionFromNativeSelectionChange = true

  private selectionChangeEvent = new Subject<Range | null>()

  private subs: Subscription[] = []
  private sub: Subscription
  private connector: NativeSelectionConnector | null = null

  private ignoreSelectionChange = false

  private changeFromUser = false
  private docContainer: HTMLElement

  private cacheCaretPositionTimer!: any
  private oldCaretPosition!: Rect | null

  constructor(@Inject(EDITOR_OPTIONS) private config: ViewOptions,
              textbus: Textbus,
              controller: Controller,
              private selection: Selection,
              private rootComponentRef: RootComponentRef,
              private input: Input,
              private scheduler: Scheduler,
              private domAdapter: DomAdapter) {
    this.docContainer = textbus.get(VIEW_DOCUMENT)
    this.onSelectionChange = this.selectionChangeEvent.asObservable().pipe(filter(() => {
      return !controller.readonly
    }))
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

  restore(abstractSelection: AbstractSelection | null, fromLocal: boolean) {
    this.changeFromUser = fromLocal
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

    function tryOffset(position: { node: Node, offset: number }) {
      if (!position.node) {
        return
      }
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

    try {
      tryOffset(focus)
      tryOffset(anchor)
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
    if (fromLocal) {
      Promise.resolve().then(bind)
      return
    }
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(bind)
    } else {
      setTimeout(bind, 30)
    }
    // hack end
  }

  destroy() {
    this.subs.forEach(i => i.unsubscribe())
    this.sub.unsubscribe()
  }

  getPositionByRange(abstractSelection: AbstractSelection) {
    let focus!: { node: Node, offset: number } | null
    let anchor!: { node: Node, offset: number } | null
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
    if (!this.oldCaretPosition) {
      this.oldCaretPosition = this.getRect(currentPosition)!
    }
    const p = this.getVerticalMovePosition(currentPosition, this.oldCaretPosition.left, toNext)
    this.cacheCaretPositionTimer = setTimeout(() => {
      this.oldCaretPosition = null
    }, 3000)
    return p
  }

  /**
   * 计算光标到下一行或上一行的位置
   * @param currentPosition
   * @param startLeft
   * @param toNext
   * @private
   */
  private getVerticalMovePosition(
    currentPosition: SelectionPosition,
    startLeft: number,
    toNext: boolean,
  ): SelectionPosition {
    const nativePos = this.findSelectedNodeAndOffset(currentPosition.slot, currentPosition.offset)
    if (!nativePos) return currentPosition

    this.ignoreSelectionChange = true
    const sel = this.nativeSelection

    sel.removeAllRanges()
    sel.setBaseAndExtent(nativePos.node, nativePos.offset, nativePos.node, nativePos.offset)
    const startRect = getLayoutRectByRange(sel.getRangeAt(0).cloneRange())

    let lastPos = currentPosition
    let prevRange: { node: Node; offset: number } | null = { node: nativePos.node, offset: nativePos.offset }

    while (true) {
      sel.modify('move', toNext ? 'forward' : 'backward', 'line')

      const { focusNode, focusOffset } = sel
      if (!focusNode) break

      // 浏览器无法继续移动
      if (prevRange && focusNode === prevRange.node && focusOffset === prevRange.offset) break
      prevRange = { node: focusNode, offset: focusOffset }

      // X 轴对齐
      // const movedRect = getLayoutRectByRange(sel.getRangeAt(0).cloneRange())
      // const xRefined = this.caretPositionFromPoint(startLeft, movedRect)
      // if (xRefined) {
      //   focusNode = xRefined.offsetNode
      //   focusOffset = xRefined.offset
      // }

      const modelPos = this.getCorrectedPosition(focusNode, focusOffset, true)
      if (!modelPos) {
        lastPos = this.getDocumentBoundary(toNext)
        break
      }

      lastPos = modelPos
      const rect = this.getRect(modelPos)!

      // 仍未到达新行，继续 modify
      if (this.isSameLine(startRect, rect, toNext)) continue

      // 已到达新行，沿该行微调 X
      this.ignoreSelectionChange = false
      return this.refineXOnLine(modelPos, startLeft, rect)
    }

    this.ignoreSelectionChange = false
    return lastPos
  }

  /** 目标位置是否仍在当前视觉行内 */
  private isSameLine(startRect: Rect, targetRect: Rect, toNext: boolean): boolean {
    const startBottom = startRect.top + startRect.height
    const targetBottom = targetRect.top + targetRect.height
    if (toNext) {
      return targetRect.top <= startRect.top || targetBottom <= startBottom
    }
    return targetRect.top >= startRect.top || targetBottom >= startBottom
  }

  /**
   * 沿目标行微调位置。
   * 起点在 targetX 右侧 → 向左找到离 targetX 最近的右侧位置；
   * 起点在 targetX 左侧 → 向右找到第一个右侧位置。
   */
  private refineXOnLine(position: SelectionPosition, targetX: number, lineRect: Rect): SelectionPosition {
    const startRect = this.getRect(position)!
    const startLeft = startRect.left
    const lineTop = lineRect.top
    const lineBottom = lineTop + Math.max(lineRect.height, 12)
    if (startLeft === targetX) return position

    let cur = position
    if (startLeft > targetX) {
      let rightSide = position
      while (true) {
        const prev = this.selection.getPreviousPositionByPosition(cur.slot, cur.offset)
        if (prev.slot === cur.slot && prev.offset === cur.offset) break
        const rect = this.getRect(prev)
        if (!rect) break
        if (rect.top >= lineBottom || rect.top + rect.height <= lineTop) break
        cur = prev
        if (rect.left === targetX) return prev
        if (rect.left < targetX) return rightSide
        rightSide = prev
      }
      return rightSide
    }

    while (true) {
      const next = this.selection.getNextPositionByPosition(cur.slot, cur.offset)
      if (next.slot === cur.slot && next.offset === cur.offset) break
      const rect = this.getRect(next)
      if (!rect) break
      if (rect.top >= lineBottom || rect.top + rect.height <= lineTop) break
      cur = next
      if (rect.left === targetX) return cur
      if (rect.left > targetX) return cur
    }
    return cur
  }

  /** 跳转到文档开头或结尾 */
  private getDocumentBoundary(toNext: boolean): SelectionPosition {
    const slots = this.rootComponentRef.component.slots
    if (toNext) {
      const lastSlot = slots[slots.length - 1]
      return { slot: lastSlot, offset: lastSlot.length }
    }
    const firstSlot = slots[0]
    return { slot: firstSlot, offset: 0 }
  }

  private caretPositionFromPoint(x: number, rect: Rect) {
    return document.caretPositionFromPoint?.(x, rect.top + rect.height / 2)
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
    let isUpdating = false
    this.subs.push(
      this.scheduler.onDocChange.subscribe(() => {
        isUpdating = true
      }),
      this.scheduler.onDocChanged.pipe(delay()).subscribe(() => {
        isUpdating = false
      }),
      fromEvent(document, 'selectionchange').subscribe(() => {
        if (isUpdating) {
          return
        }
        if (this.syncSelectionFromNativeSelectionChange) {
          this.syncSelection(connector)
        }
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
        const nativeNode = this.domAdapter.getNativeNodeBySlot(this.rootComponentRef.component.slots.at(0)!)
        if (!nativeNode) {
          return
        }
        nativeRange.setEndAfter(nativeNode.lastChild!)
      } else {
        const nativeNode = this.domAdapter.getNativeNodeBySlot(this.rootComponentRef.component.slots.at(-1)!)
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

    if ([Node.ELEMENT_NODE, Node.TEXT_NODE].includes(nativeRange.commonAncestorContainer?.nodeType as any) &&
      startPosition && endPosition) {
      const abstractSelection = connector.beforeChange(isFocusEnd ? {
        anchorSlot: startPosition.slot,
        anchorOffset: startPosition.offset,
        focusSlot: endPosition.slot,
        focusOffset: endPosition.offset
      } : {
        focusSlot: startPosition.slot,
        focusOffset: startPosition.offset,
        anchorSlot: endPosition.slot,
        anchorOffset: endPosition.offset
      })
      if (!abstractSelection) {
        this.selectionChangeEvent.next(null)
        connector.setSelection(null)
        return
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

  private findSelectedNodeAndOffset(slot: Slot, offset: number): { node: Node, offset: number } | null {
    const prev = slot.getContentAtIndex(offset - 1)
    const nodes = this.domAdapter.getNodesBySlot(slot)

    if (prev) {
      if (typeof prev !== 'string') {
        const nativeNode = this.domAdapter.getNativeNodeByComponent(prev)!
        return {
          node: nativeNode.parentNode!,
          offset: Array.from(nativeNode.parentNode!.childNodes).indexOf(nativeNode) + 1
        }
      } else if (prev === '\n') {
        for (const node of nodes) {
          if (node instanceof Text) {
            continue
          }
          if (node.nodeName === 'BR') {
            const position = this.domAdapter.getLocationByNativeNode(node)
            if (position) {
              if (position.endIndex === offset) {
                const parentNode = node.parentNode!
                return {
                  node: parentNode,
                  offset: Array.from(parentNode.childNodes).indexOf(node as ChildNode) + 1
                }
              }
            }
          }
        }
      }
    }
    const current = slot.getContentAtIndex(offset)
    if (current && typeof current !== 'string') {
      const nativeNode = this.domAdapter.getNativeNodeByComponent(current)!
      return {
        node: nativeNode.parentNode!,
        offset: Array.from(nativeNode.parentNode!.childNodes).indexOf(nativeNode)
      }
    }
    for (const node of nodes) {
      if (node instanceof Element) {
        if (node.tagName === 'BR') {
          const position = this.domAdapter.getLocationByNativeNode(node)
          if (position) {
            if (position.startIndex === offset) {
              const parentNode = node.parentNode!
              return {
                node: parentNode,
                offset: Array.from(parentNode.childNodes).indexOf(node)
              }
            }
          }
        }
        continue
      }
      const position = this.domAdapter.getLocationByNativeNode(node)
      if (position) {
        if (offset >= position.startIndex && offset <= position.endIndex) {
          return {
            node: node,
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
      const containerPosition = this.domAdapter.getLocationByNativeNode(node)
      const childNode = node.childNodes[offset]
      if (childNode) {
        const childPosition = this.domAdapter.getLocationByNativeNode(childNode)
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
        const prevPosition = this.domAdapter.getLocationByNativeNode(prevNode)
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
      const containerPosition = this.domAdapter.getLocationByNativeNode(node)
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
    const position = this.domAdapter.getLocationByNativeNode(node as any)
    if (position) {
      return {
        slot: position.slot,
        offset: toAfter ? position.startIndex : position.endIndex
      }
    }
    const firstChild = toAfter ? node.firstChild : node.lastChild
    if (firstChild && !excludeNodes.includes(firstChild as Node)) {
      return this.findFocusNode(firstChild, toAfter, excludeNodes)
    }
    const nextSibling = toAfter ? node.nextSibling : node.previousSibling
    if (nextSibling) {
      return this.findFocusNode(nextSibling, toAfter, excludeNodes)
    }
    return this.findFocusNodeByParent(node, toAfter, excludeNodes)
  }

  private findFocusNodeByParent(node: Node, toAfter: boolean, excludeNodes: Node[]): SelectionPosition | null {
    const parentNode = node.parentNode
    if (parentNode) {
      if (excludeNodes.includes(parentNode)) {
        const nextNode = toAfter ? parentNode.nextSibling : parentNode.previousSibling
        if (nextNode) {
          return this.findFocusNode(nextNode, toAfter, excludeNodes)
        }
        return this.findFocusNodeByParent(parentNode, toAfter, excludeNodes)
      }
      const parentPosition = this.domAdapter.getLocationByNativeNode(parentNode)
      if (parentPosition) {
        return {
          slot: parentPosition.slot,
          offset: toAfter ? parentPosition.endIndex : parentPosition.startIndex
        }
      }
      excludeNodes.push(parentNode)
      const nextNode = toAfter ? parentNode.nextSibling : parentNode.previousSibling
      if (nextNode) {
        return this.findFocusNode(nextNode, toAfter, excludeNodes)
      }
      return this.findFocusNodeByParent(parentNode, toAfter, excludeNodes)
    }
    return null
  }
}
