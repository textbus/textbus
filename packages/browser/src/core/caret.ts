import { fromEvent, Observable, Subject, Subscription } from '@tanbo/stream'
import { Inject, Injectable } from '@tanbo/di'

import { createElement } from '../_utils/uikit'
import { EDITOR_CONTAINER } from './injection-tokens'

export function getLayoutRectByRange(range: Range) {
  const {startContainer, startOffset} = range
  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    const offsetNode = startContainer.childNodes[startOffset]
    let isInsertBefore = false
    if (offsetNode) {
      if (offsetNode.nodeType === Node.ELEMENT_NODE && offsetNode.nodeName.toLowerCase() !== 'br') {
        return (offsetNode as HTMLElement).getBoundingClientRect()
      } else {
        isInsertBefore = true
      }
    }
    const span = startContainer.ownerDocument!.createElement('span')
    span.innerText = '\u200b'
    span.style.display = 'inline-block'
    if (isInsertBefore) {
      startContainer.insertBefore(span, offsetNode)
    } else {
      startContainer.appendChild(span)
    }
    const rect = span.getBoundingClientRect()
    startContainer.removeChild(span)
    return rect
  }
  return range.getBoundingClientRect()
}

export interface CaretPosition {
  left: number
  top: number
  height: number
}

@Injectable()
export class Caret {
  onPositionChange: Observable<CaretPosition>
  elementRef: HTMLElement

  set offsetX(x: string) {
    this._offsetX = x
    this.elementRef.style.transform = `translate(${x}, ${this.offsetY})`
  }

  get offsetX() {
    return this._offsetX
  }

  set offsetY(y: string) {
    this._offsetY = y
    this.elementRef.style.transform = `translate(${this.offsetX}, ${y})`
  }

  get offsetY() {
    return this._offsetY
  }

  private _offsetX = '0'
  private _offsetY = '0'
  private timer: any = null
  private caret: HTMLElement

  private set display(v: boolean) {
    this._display = v
    this.caret.style.visibility = v ? 'visible' : 'hidden'
  }

  private get display() {
    return this._display
  }

  private _display = true
  private flashing = true

  private subs: Subscription[] = []

  private positionChangeEvent = new Subject<CaretPosition>()
  private oldRange: Range | null = null

  constructor(
    @Inject(EDITOR_CONTAINER) private editorContainer: HTMLElement) {
    this.onPositionChange = this.positionChangeEvent.asObservable()
    this.elementRef = createElement('div', {
      styles: {
        position: 'absolute',
        width: '2px',
        pointerEvents: 'none'
      },
      children: [
        this.caret = createElement('span', {
          styles: {
            width: '100%',
            height: '100%',
            position: 'absolute',
            left: 0,
            top: 0
          }
        })
      ]
    })

    this.subs.push(
      fromEvent(document, 'mousedown').subscribe(() => {
        this.flashing = false
      }),
      fromEvent(document, 'mouseup').subscribe(() => {
        this.flashing = true
      })
    )

    editorContainer.appendChild(this.elementRef)
  }

  show(range: Range) {
    const oldRange = this.oldRange
    if (oldRange && range.startOffset === oldRange.startOffset &&
      range.startContainer === oldRange.startContainer &&
      range.endOffset === oldRange.endOffset &&
      range.endContainer === oldRange.endContainer) {
      return
    }
    this.updateCursorPosition(range)
    clearTimeout(this.timer)
    if (range.collapsed) {
      this.display = true
      const toggleShowHide = () => {
        this.display = !this.display || !this.flashing
        this.timer = setTimeout(toggleShowHide, 400)
      }
      this.timer = setTimeout(toggleShowHide, 400)
    } else {
      this.display = false
    }
    this.oldRange = range.cloneRange()
  }

  hide() {
    this.oldRange = null
    this.display = false
    clearTimeout(this.timer)
  }

  destroy() {
    clearTimeout(this.timer)
    this.subs.forEach(i => i.unsubscribe())
  }

  private updateCursorPosition(nativeRange: Range) {
    const startContainer = nativeRange.startContainer

    const node = (startContainer.nodeType === Node.ELEMENT_NODE ? startContainer : startContainer.parentNode) as HTMLElement
    if (node?.nodeType !== Node.ELEMENT_NODE) {
      return
    }
    const rect = getLayoutRectByRange(nativeRange)
    const {fontSize, lineHeight, color} = getComputedStyle(node)

    let height: number
    if (isNaN(+lineHeight)) {
      const f = parseFloat(lineHeight)
      if (isNaN(f)) {
        height = parseFloat(fontSize)
      } else {
        height = f
      }
    } else {
      height = parseFloat(fontSize) * parseFloat(lineHeight)
    }

    const boxHeight = Math.max(height, rect.height)

    let top = rect.top
    if (rect.height < height) {
      top -= (height - rect.height) / 2
    }

    const containerRect = this.editorContainer.getBoundingClientRect()

    Object.assign(this.elementRef.style, {
      left: rect.left - containerRect.left + 'px',
      top: top - containerRect.top + 'px',
      height: boxHeight + 'px',
      lineHeight: boxHeight + 'px',
      fontSize: fontSize
    })

    this.caret.style.backgroundColor = color
    this.positionChangeEvent.next({
      left: rect.left - containerRect.left,
      top: top - containerRect.top,
      height: boxHeight
    })
  }
}
