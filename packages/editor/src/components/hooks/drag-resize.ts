import { onDestroy, onViewInit, Ref, Selection, Renderer, useContext, useSelf, Rect } from '@textbus/core'
import { createElement, getBoundingClientRect, VIEW_CONTAINER } from '@textbus/browser'
import { fromEvent, Subscription } from '@tanbo/stream'

const text = document.createElement('div')

const handlers: HTMLButtonElement[] = []

for (let i = 0; i < 8; i++) {
  const button = document.createElement('button')
  button.type = 'button'
  handlers.push(button)
}

const mask = createElement('div', {
  classes: ['textbus-image-video-resize'],
  children: [
    ...handlers,
    text
  ]
})

export interface DragRect {
  width: string
  height: string
}

let currentRef: Ref<HTMLElement> | null = null

export function useDragResize(ref: Ref<HTMLElement>, callback: (rect: DragRect) => void) {
  const context = useContext()
  const componentInstance = useSelf()
  const selection = context.get(Selection)
  const docContainer = context.get(VIEW_CONTAINER)
  const renderer = context.get(Renderer)

  const self = useSelf()
  let isFocus = false

  const subs: Subscription[] = []

  subs.push(
    renderer.onViewChecked.subscribe(() => {
      if (isFocus && currentRef) {
        updateStyle(currentRef.current!, getBoundingClientRect(docContainer))
      }
    }),
    selection.onChange.subscribe(() => {
      const index = self.parent?.indexOf(self)
      if (selection.startSlot !== self.parent ||
        selection.endSlot !== self.parent ||
        selection.startOffset !== index ||
        selection.endOffset !== index + 1) {
        isFocus = false
        mask.parentNode?.removeChild(mask)
      }
    }),
    fromEvent<MouseEvent>(mask, 'mousedown').subscribe(ev => {
      if (currentRef !== ref || !currentRef?.current) {
        return
      }

      docContainer.style.pointerEvents = 'none'

      const startRect = getBoundingClientRect(ref.current!)

      const startX = ev.clientX
      const startY = ev.clientY

      const startWidth = startRect.width
      const startHeight = startRect.height
      const startHypotenuse = Math.sqrt(startWidth * startWidth + startHeight * startHeight)

      let endWidth = startWidth
      let endHeight = startHeight
      const index = handlers.indexOf(ev.target as HTMLButtonElement)

      const unMove = fromEvent<MouseEvent>(document, 'mousemove').subscribe(ev => {
        const moveX = ev.clientX
        const moveY = ev.clientY

        const offsetX = moveX - startX
        const offsetY = moveY - startY

        let gainHypotenuse: number
        let proportion: number
        let sideX: number
        let sideY: number

        switch (index) {
          case 0:
          case 4:
            sideX = startWidth + offsetX
            sideY = startHeight + offsetY
            gainHypotenuse = Math.sqrt(sideX * sideX + sideY * sideY)
            proportion = gainHypotenuse / startHypotenuse
            if (index === 0) {
              proportion = 1 - (proportion - 1)
            }
            endWidth = startWidth * proportion
            endHeight = startHeight * proportion
            break
          case 2:
            sideX = startWidth + offsetX
            sideY = startHeight - offsetY
            gainHypotenuse = Math.sqrt(sideX * sideX + sideY * sideY)
            proportion = gainHypotenuse / startHypotenuse
            endWidth = startWidth * proportion
            endHeight = startHeight * proportion
            break
          case 6:
            sideX = startWidth - offsetX
            sideY = startHeight + offsetY
            gainHypotenuse = Math.sqrt(sideX * sideX + sideY * sideY)
            gainHypotenuse = Math.sqrt(sideX * sideX + sideY * sideY)
            proportion = gainHypotenuse / startHypotenuse
            endWidth = startWidth * proportion
            endHeight = startHeight * proportion
            break
          case 1:
            endHeight = startHeight - offsetY
            break
          case 5:
            endHeight = startHeight + offsetY
            break
          case 3:
            endWidth = startWidth + offsetX
            break
          case 7:
            endWidth = startWidth - offsetX
            break
        }
        currentRef!.current!.style.width = endWidth + 'px'
        currentRef!.current!.style.height = endHeight + 'px'
        updateStyle(currentRef!.current!, getBoundingClientRect(docContainer))
      })

      const unUp = fromEvent(document, 'mouseup').subscribe(() => {
        callback({
          width: endWidth + 'px',
          height: endHeight + 'px'
        })
        docContainer.style.pointerEvents = ''
        unMove.unsubscribe()
        unUp.unsubscribe()
      })
    })
  )

  onViewInit(() => {
    subs.push(fromEvent(ref.current!, 'click').subscribe((ev) => {
      currentRef = ref
      isFocus = true
      selection.selectComponent(componentInstance, true)
      updateStyle(ref.current!, getBoundingClientRect(docContainer))
      docContainer.appendChild(mask)
      ev.stopPropagation()
    }))
  })

  onDestroy(() => {
    isFocus = false
    mask.parentNode?.removeChild(mask)
    subs.forEach(i => i.unsubscribe())
  })
}

function updateStyle(nativeElement: HTMLElement, offsetRect: Rect) {
  const rect = getBoundingClientRect(nativeElement)
  // eslint-disable-next-line max-len
  mask.style.cssText = `left: ${rect.left - offsetRect.left}px; top: ${rect.top - offsetRect.top}px; width: ${rect.width}px; height: ${rect.height}px;`
  text.innerText = `${Math.round(rect.width)}px * ${Math.round(rect.height)}px`
}
