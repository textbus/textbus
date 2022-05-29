import { Inject, Injectable, Optional } from '@tanbo/di'
import {
  createElement,
  EDITOR_CONTAINER,
  getLayoutRectByRange,
  SelectionBridge
} from '@textbus/browser'
import { Selection, SelectionPaths } from '@textbus/core'
import { Subject } from '@tanbo/stream'

export interface RemoteSelection {
  color: string
  username: string
  paths: SelectionPaths
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface SelectionRect extends Rect {
  color: string
  username: string
}

export interface RemoteSelectionCursor {
  cursor: HTMLElement
  anchor: HTMLElement
  userTip: HTMLElement
}

export abstract class CollaborateCursorAwarenessDelegate {
  abstract getRects(selection: Selection, nativeRange: Range): false | Rect[]
}

@Injectable()
export class CollaborateCursor {
  private canvas = createElement('canvas', {
    styles: {
      position: 'absolute',
      opacity: 0.5,
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none'
    }
  }) as HTMLCanvasElement
  private context = this.canvas.getContext('2d')!
  private tooltips = createElement('div', {
    styles: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      fontSize: '12px',
      zIndex: 10
    }
  })

  private onRectsChange = new Subject<SelectionRect[]>()

  constructor(@Inject(EDITOR_CONTAINER) private container: HTMLElement,
              @Optional() private awarenessDelegate: CollaborateCursorAwarenessDelegate,
              private nativeSelection: SelectionBridge,
              private selection: Selection) {
    container.prepend(this.canvas, this.tooltips)
    this.onRectsChange.subscribe(rects => {
      for (const rect of rects) {
        this.context.fillStyle = rect.color
        this.context.beginPath()
        this.context.rect(rect.x, rect.y, rect.width, rect.height)
        this.context.fill()
        this.context.closePath()
      }
    })
  }

  draw(paths: RemoteSelection[]) {
    const containerRect = this.container.getBoundingClientRect()
    this.canvas.width = containerRect.width
    this.canvas.height = containerRect.height
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const users: SelectionRect[] = []


    paths.filter(i => {
      return i.paths.anchor.length && i.paths.focus.length
    }).forEach(item => {
      const anchorOffset = item.paths.anchor.pop()!
      const anchorSlot = this.selection.findSlotByPaths(item.paths.anchor)
      const focusOffset = item.paths.focus.pop()!
      const focusSlot = this.selection.findSlotByPaths(item.paths.focus)
      if (!anchorSlot || !focusSlot) {
        return
      }

      const {focus, anchor} = this.nativeSelection.getPositionByRange({
        focusOffset,
        anchorOffset,
        focusSlot,
        anchorSlot
      })
      if (!focus || !anchor) {
        return
      }
      const nativeRange = document.createRange()
      nativeRange.setStart(anchor.node, anchor.offset)
      nativeRange.setEnd(focus.node, focus.offset)
      if ((anchor.node !== focus.node || anchor.offset !== focus.offset) && nativeRange.collapsed) {
        nativeRange.setStart(focus.node, focus.offset)
        nativeRange.setEnd(anchor.node, anchor.offset)
      }

      let rects: Rect[] | DOMRectList | false = false
      if (this.awarenessDelegate) {
        rects = this.awarenessDelegate.getRects(this.selection, nativeRange)
      }
      if (!rects) {
        rects = nativeRange.getClientRects()
      }
      const selectionRects: SelectionRect[] = []
      for (let i = rects.length - 1; i >= 0; i--) {
        const rect = rects[i]
        selectionRects.push({
          color: item.color,
          username: item.username,
          x: rect.x - containerRect.x,
          y: rect.y - containerRect.y,
          width: rect.width,
          height: rect.height,
        })
      }
      this.onRectsChange.next(selectionRects)

      const cursorRange = nativeRange.cloneRange()
      cursorRange.setStart(focus.node, focus.offset)
      cursorRange.collapse(true)

      const cursorRect = getLayoutRectByRange(cursorRange)

      users.push({
        username: item.username,
        color: item.color,
        x: cursorRect.x - containerRect.x,
        y: cursorRect.y - containerRect.y,
        width: 2,
        height: cursorRect.height
      })
    })
    this.drawUserCursor(users)
  }

  private drawUserCursor(rects: SelectionRect[]) {
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]
      const {cursor, userTip, anchor} = this.getUserCursor(i)
      Object.assign(cursor.style, {
        left: rect.x + 'px',
        top: rect.y + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
        background: rect.color,
        display: 'block'
      })
      anchor.style.background = rect.color
      userTip.innerText = rect.username
      userTip.style.background = rect.color
    }

    for (let i = rects.length; i < this.tooltips.children.length; i++) {
      this.tooltips.removeChild(this.tooltips.children[i])
    }
  }

  private getUserCursor(index: number): RemoteSelectionCursor {
    let child: HTMLElement = this.tooltips.children[index] as HTMLElement
    if (child) {
      const anchor = child.children[0] as HTMLElement
      return {
        cursor: child,
        anchor,
        userTip: anchor.children[0] as HTMLElement
      }
    }
    const userTip = createElement('span', {
      styles: {
        position: 'absolute',
        display: 'none',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: '2px',
        bottom: '100%',
        whiteSpace: 'nowrap',
        color: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,.1)',
        borderRadius: '3px',
        padding: '3px 5px',
        pointerEvents: 'none',
      }
    })

    const anchor = createElement('span', {
      styles: {
        position: 'absolute',
        top: '-2px',
        left: '-2px',
        width: '6px',
        height: '6px',
        pointerEvents: 'auto',
        pointer: 'cursor',
      },
      children: [userTip],
      on: {
        mouseenter() {
          userTip.style.display = 'block'
        },
        mouseleave() {
          userTip.style.display = 'none'
        }
      }
    })
    child = createElement('span', {
      styles: {
        position: 'absolute',
      },
      children: [
        anchor
      ]
    })
    this.tooltips.append(child)
    return {
      cursor: child,
      anchor,
      userTip
    }
  }
}
