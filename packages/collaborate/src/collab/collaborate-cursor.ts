import { Inject, Injectable } from '@tanbo/di'
import { createElement, EDITABLE_DOCUMENT, EDITOR_CONTAINER, SelectionBridge } from '@textbus/browser'
import { Selection, SelectionPaths } from '@textbus/core'
import { Subject } from '@tanbo/stream'

export interface RemoteSelection {
  color: string
  username: string
  paths: SelectionPaths
}

export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

export interface SelectionInfo {
  color: string
  username: string
  rects: SelectionRect[]
  focusEnd: boolean
}

export interface RemoteSelectionCursor {
  cursor: HTMLElement
  anchor: HTMLElement
  userTip: HTMLElement
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
      fontSize: '12px'
    }
  })

  private onRectsChange = new Subject<SelectionInfo>()

  constructor(@Inject(EDITOR_CONTAINER) private container: HTMLElement,
              @Inject(EDITABLE_DOCUMENT) private document: Document,
              private nativeSelection: SelectionBridge,
              private selection: Selection) {
    container.appendChild(this.canvas)
    container.appendChild(this.tooltips)
    this.onRectsChange.subscribe(info => {
      const color = info.color
      const rects = info.rects
      for (const rect of rects) {
        this.context.fillStyle = color
        this.context.beginPath()
        this.context.rect(rect.x, rect.y, rect.width, rect.height)
        this.context.fill()
        this.context.closePath()
      }
    })
  }

  draw(paths: RemoteSelection[]) {
    this.canvas.width = this.container.offsetWidth
    this.canvas.height = this.container.offsetHeight
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const users: SelectionInfo[] = []

    paths.filter(i => {
      return i.paths.start.length && i.paths.end.length
    }).forEach(item => {
      const startOffset = item.paths.start.pop()!
      const startSlot = this.selection.findSlotByPaths(item.paths.start)
      const endOffset = item.paths.end.pop()!
      const endSlot = this.selection.findSlotByPaths(item.paths.end)

      if (startSlot && endSlot) {
        const position = this.nativeSelection.getPositionByRange({
          startOffset,
          endOffset,
          startSlot,
          endSlot
        })
        if (position.start && position.end) {
          const nativeRange = this.document.createRange()
          nativeRange.setStart(position.start.node, position.start.offset)
          nativeRange.setEnd(position.end.node, position.end.offset)

          const rects = nativeRange.getClientRects()
          const selectionRects: SelectionRect[] = []
          for (let i = rects.length - 1; i >= 0; i--) {
            const rect = rects[i]
            selectionRects.push({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            })
          }

          if (rects.length === 0) {
            const rect = nativeRange.getBoundingClientRect()
            if (rect.x !== 0 || rect.y !== 0 || rect.width !== 0 || rect.height !== 0) {
              selectionRects.push({
                x: rect.x,
                y: rect.y,
                width: 1,
                height: rect.height,
              })
            }
          }
          const info: SelectionInfo = {
            ...item,
            rects: selectionRects,
            focusEnd: item.paths.focusEnd
          }
          this.onRectsChange.next(info)

          users.push(info)
        }
      }
    })
    this.drawUserCursor(users)
  }

  private drawUserCursor(users: SelectionInfo[]) {
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const child = user.rects[user.focusEnd ? user.rects.length - 1 : 0]
      const {cursor, userTip, anchor} = this.getUserCursor(i)
      if (!child) {
        cursor.style.display = 'none'
      } else {
        Object.assign(cursor.style, {
          left: child.x + (user.focusEnd ? child.width : 0) + 'px',
          top: child.y + 'px',
          width: '2px',
          height: child.height + 'px',
          background: user.color,
          display: 'block'
        })
        anchor.style.background = user.color
        userTip.innerText = user.username
        userTip.style.background = user.color
      }
    }

    for (let i = users.length; i < this.tooltips.children.length; i++) {
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
          anchor.style.transform = 'scale(1.2)'
          userTip.style.display = 'block'
        },
        mouseleave() {
          userTip.style.display = 'none'
          anchor.style.transform = ''
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
