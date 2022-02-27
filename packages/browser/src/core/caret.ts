import { BehaviorSubject, fromEvent, Observable, Subject, Subscription } from '@tanbo/stream'

import { createElement } from '../_utils/uikit'

export function getLayoutRectByRange(range: Range) {
  const {startContainer, startOffset} = range
  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    const offsetNode = startContainer.childNodes[startOffset]
    let isInsertBefore = false
    if (offsetNode) {
      if (offsetNode.nodeType === Node.ELEMENT_NODE) {
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

export class Caret {
  onPositionChange: Observable<CaretPosition>
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

  private positionChangeEvent = new Subject<CaretPosition>()

  private containerRect!: DOMRect

  constructor(
    private resizeSubject: BehaviorSubject<DOMRect>,
    private document: Document,
    private editorContainer: HTMLElement) {
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
      resizeSubject.subscribe(rect => {
        this.containerRect = rect
      }),
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
    this.updateCursorPosition(range)
    this.display = true
    clearTimeout(this.timer)
    const toggleShowHide = () => {
      this.display = !this.display || !this.flashing
      this.timer = setTimeout(toggleShowHide, 400)
    }
    this.timer = setTimeout(toggleShowHide, 400)
  }

  hide() {
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
    if (nativeRange.collapsed) {
      this.positionChangeEvent.next({
        left: rect.left - containerRect.left,
        top: top - containerRect.top,
        height: boxHeight
      })
    }
  }
}
