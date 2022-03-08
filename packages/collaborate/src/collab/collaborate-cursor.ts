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
  color: string
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

  private onRectChange = new Subject<SelectionRect>()

  constructor(@Inject(EDITOR_CONTAINER) private container: HTMLElement,
              @Inject(EDITABLE_DOCUMENT) private document: Document,
              private nativeSelection: SelectionBridge,
              private selection: Selection) {
    container.appendChild(this.canvas)
    this.onRectChange.subscribe(rect => {
      this.context.fillStyle = rect.color
      this.context.beginPath()
      this.context.rect(Math.ceil(rect.x), Math.ceil(rect.y), Math.ceil(rect.width), Math.ceil(rect.height))
      this.context.fill()
      this.context.closePath()
    })
  }

  draw(paths: RemoteSelection[]) {
    this.canvas.width = this.container.offsetWidth
    this.canvas.height = this.container.offsetHeight
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)

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
          let prev: any = {}
          for (let i = rects.length - 1; i >= 0; i--) {
            const rect = rects[i]
            if (prev.y === rect.y) {
              continue
            }
            prev = rect
            this.onRectChange.next({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              color: item.color
            })
          }

          if (rects.length === 0) {
            const rect = nativeRange.getBoundingClientRect()
            this.onRectChange.next({
              x: rect.x,
              y: rect.y,
              width: 1,
              height: rect.height,
              color: item.color
            })
          }
        }
      }
    })
  }
}
