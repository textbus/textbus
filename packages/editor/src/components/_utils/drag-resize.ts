import { onDestroy, onViewChecked, onViewInit, Ref, Selection, useContext, useSelf } from '@textbus/core'
import { createElement, EDITABLE_DOCUMENT, EDITOR_CONTAINER } from '@textbus/browser'
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
  const docContainer = context.get(EDITOR_CONTAINER)
  const editorDocument = context.get(EDITABLE_DOCUMENT)

  let isFocus = false

  const subs: Subscription[] = []

  onViewChecked(() => {
    if (isFocus && currentRef) {
      updateStyle(currentRef.current!, docContainer.getBoundingClientRect())
    } else {
      mask.parentNode?.removeChild(mask)
    }
  })
  subs.push(
    fromEvent(editorDocument, 'click').subscribe(() => {
      isFocus = false
      // mask.parentNode?.removeChild(mask)
    }),
    fromEvent<MouseEvent>(mask, 'mousedown').subscribe(ev => {
      if (currentRef !== ref || !currentRef?.current) {
        return
      }

      docContainer.style.pointerEvents = 'none'

      const startRect = ref.current!.getBoundingClientRect()

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
        updateStyle(currentRef!.current!, docContainer.getBoundingClientRect())
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
      updateStyle(ref.current!, docContainer.getBoundingClientRect())
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

function updateStyle(nativeElement: HTMLElement, offsetRect: DOMRect) {
  const rect = nativeElement.getBoundingClientRect()
  mask.style.cssText = `left: ${rect.left - offsetRect.left}px; top: ${rect.top - offsetRect.top}px; width: ${rect.width}px; height: ${rect.height}px;`
  text.innerText = `${Math.round(rect.width)}px * ${Math.round(rect.height)}px`
}
