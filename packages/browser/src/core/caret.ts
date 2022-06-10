import { distinctUntilChanged, fromEvent, Observable, Subject, Subscription } from '@tanbo/stream'
import { Inject, Injectable } from '@tanbo/di'
import { Scheduler } from '@textbus/core'

import { createElement } from '../_utils/uikit'
import { VIEW_MASK } from './injection-tokens'

export function getLayoutRectByRange(range: Range) {
  const {startContainer, startOffset} = range
  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    const offsetNode = startContainer.childNodes[startOffset]
    let isInsertBefore = false
    if (offsetNode) {
      if (offsetNode.nodeType === Node.ELEMENT_NODE && offsetNode.nodeName.toLowerCase() !== 'br') {
        return (offsetNode as HTMLElement).getBoundingClientRect()
      }
      isInsertBefore = true
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

export interface CaretStyle {
  height: string
  lineHeight: string
  fontSize: string
}

@Injectable()
export class Caret {
  onPositionChange: Observable<CaretPosition | null>
  onStyleChange: Observable<CaretStyle>
  elementRef: HTMLElement
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

  private positionChangeEvent = new Subject<CaretPosition | null>()
  private styleChangeEvent = new Subject<CaretStyle>()
  private oldRange: Range | null = null

  constructor(
    private scheduler: Scheduler,
    @Inject(VIEW_MASK) private editorMask: HTMLElement) {
    this.onPositionChange = this.positionChangeEvent.asObservable().pipe(distinctUntilChanged())
    this.onStyleChange = this.styleChangeEvent.asObservable()
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

    editorMask.appendChild(this.elementRef)
  }

  refresh() {
    if (this.oldRange) {
      this.show(this.oldRange, false)
    }
  }

  show(range: Range, restart: boolean) {
    this.oldRange = range
    if (restart || this.scheduler.hasLocalUpdate) {
      clearTimeout(this.timer)
    }
    if (range.collapsed) {
      this.updateCursorPosition(range)
      if (restart || this.scheduler.hasLocalUpdate) {
        this.display = true
        const toggleShowHide = () => {
          this.display = !this.display || !this.flashing
          this.timer = setTimeout(toggleShowHide, 400)
        }
        this.timer = setTimeout(toggleShowHide, 400)
      }
    } else {
      this.display = false
      clearTimeout(this.timer)
      this.positionChangeEvent.next(null)
    }
  }

  hide() {
    this.display = false
    clearTimeout(this.timer)
    this.positionChangeEvent.next(null)
  }

  destroy() {
    clearTimeout(this.timer)
    this.subs.forEach(i => i.unsubscribe())
  }

  private updateCursorPosition(nativeRange: Range) {
    const startContainer = nativeRange.startContainer

    const node = (startContainer.nodeType === Node.ELEMENT_NODE ? startContainer : startContainer.parentNode) as HTMLElement
    if (node?.nodeType !== Node.ELEMENT_NODE) {
      this.positionChangeEvent.next(null)
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

    const containerRect = this.editorMask.getBoundingClientRect()

    Object.assign(this.elementRef.style, {
      left: rect.left - containerRect.left + 'px',
      top: top - containerRect.top + 'px',
      height: boxHeight + 'px',
      lineHeight: boxHeight + 'px',
      fontSize
    })

    this.caret.style.backgroundColor = color
    this.styleChangeEvent.next({
      height: boxHeight + 'px',
      lineHeight: boxHeight + 'px',
      fontSize
    })
    this.positionChangeEvent.next({
      left: rect.left - containerRect.left,
      top: top - containerRect.top,
      height: boxHeight
    })
  }
}
