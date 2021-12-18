import { onDestroy, onViewInit, Ref, Renderer, TBSelection, useContext, useSelf } from '@textbus/core'
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

function matchAngle(x: number, y: number, startAngle: number, endAngle: number) {
  let angle = Math.atan(x / y) / (Math.PI / 180)
  if (x <= 0 && y >= 0 || x >= 0 && y >= 0) {
    angle = 180 + angle
  }
  if (x >= 0 && y <= 0) {
    angle = 360 + angle
  }
  if (startAngle <= endAngle) {
    return angle >= startAngle && angle <= endAngle
  }
  return angle >= startAngle && angle <= 360 || angle <= endAngle && angle <= 0
}

export interface DragRect {
  width: string
  height: string
}

export function useDragResize(ref: Ref<HTMLElement>, callback: (rect: DragRect) => void) {
  const context = useContext()
  const componentInstance = useSelf()
  const selection = context.get(TBSelection)
  const docContainer = context.get(EDITOR_CONTAINER)
  const editorDocument = context.get(EDITABLE_DOCUMENT)
  const renderer = context.get(Renderer)

  let isFocus = false

  const subs: Subscription[] = []

  subs.push(
    fromEvent(editorDocument, 'click').subscribe(() => {
      isFocus = false
      mask.parentNode?.removeChild(mask)
    }),
    renderer.onViewChecked.subscribe(() => {
      if (isFocus) {
        updateStyle(ref.current!)
      }
    }),
    fromEvent<MouseEvent>(mask, 'mousedown').subscribe(ev => {
      if (!ref.current) {
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

        if ([0, 2, 4, 6].includes(index)) {

          const gainHypotenuse = Math.sqrt(offsetX * offsetX + offsetY * offsetY)
          let proportion = gainHypotenuse / startHypotenuse

          if (!(index === 0 && matchAngle(offsetX, offsetY, 315, 135) ||
            index === 2 && matchAngle(offsetX, offsetY, 225, 45) ||
            index === 4 && matchAngle(offsetX, offsetY, 135, 315) ||
            index === 6 && matchAngle(offsetX, offsetY, 45, 225))) {
            proportion = -proportion
          }

          endWidth = Math.round(startWidth + startWidth * proportion)
          endHeight = Math.round(startHeight + startHeight * proportion)

        } else if ([1, 5].includes(index)) {
          endHeight = Math.round(startHeight + (index === 1 ? -offsetY : offsetY))
        } else if ([3, 7].includes(index)) {
          endWidth = Math.round(startWidth + (index === 3 ? offsetX : -offsetX))
        }
        ref.current!.style.width = endWidth + 'px'
        ref.current!.style.height = endHeight + 'px'
        updateStyle(ref.current!)
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
      isFocus = true
      selection.selectComponent(componentInstance, true)
      updateStyle(ref.current!)
      docContainer.appendChild(mask)
      ev.stopPropagation()
    }))
  })

  onDestroy(() => {
    subs.forEach(i => i.unsubscribe())
  })
}

function updateStyle(nativeElement: HTMLElement) {
  const rect = nativeElement.getBoundingClientRect()
  mask.style.cssText = `left: ${rect.left}px; top: ${rect.top}px; width: ${rect.width}px; height: ${rect.height}px;`
  text.innerText = `${Math.round(rect.width)}px * ${Math.round(rect.height)}px`
}
