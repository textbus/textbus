import { withScopedCSS } from '@viewfly/scoped-css'
import { createRef, createSignal, inject, onUnmounted, Props, StaticRef } from '@viewfly/core'
import { VIEW_CONTAINER } from '@textbus/platform-browser'
import { fromEvent, Selection } from '@textbus/core'

import style from './drag-resize.scoped.scss'
import { ImageComponent } from '../../textbus/components/image/image.component'
import { VideoComponent } from '../../textbus/components/video/video.component'

export interface DragResizeProps extends Props {
  component: ImageComponent | VideoComponent
  source: StaticRef<HTMLImageElement | HTMLVideoElement>
}

export function DragResize(props: DragResizeProps) {
  const isShow = createSignal(false)

  const selection = inject(Selection)
  const docContainer = inject(VIEW_CONTAINER)
  const component = props.component
  const ref = createRef<HTMLElement>()

  const sub = selection.onChange.subscribe(() => {
    const index = component.parent?.indexOf(component)
    if (selection.startSlot !== component.parent ||
      selection.endSlot !== component.parent ||
      selection.startOffset !== index ||
      selection.endOffset !== index + 1) {
      isShow.set(false)
      return
    }
    isShow.set(true)
    const width = ref.current!.offsetWidth
    const height = ref.current!.offsetHeight
    mask.current!.innerText = `${Math.round(width)}px * ${Math.round(height)}px`
  })

  function selectComponent() {
    selection.selectComponent(component, true)
  }

  onUnmounted(() => {
    sub.unsubscribe()
  })

  const btnGroup = createRef<HTMLElement>()
  const mask = createRef<HTMLElement>()

  function drag(ev: MouseEvent) {
    docContainer.style.pointerEvents = 'none'
    const ele = props.source.current!

    const startRect = ele.getBoundingClientRect()

    const startX = ev.clientX
    const startY = ev.clientY

    const startWidth = startRect.width
    const startHeight = startRect.height
    const startHypotenuse = Math.sqrt(startWidth * startWidth + startHeight * startHeight)

    let endWidth = startWidth
    let endHeight = startHeight
    const handlers = Array.from(btnGroup.current!.children)
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
      ele.style.width = endWidth + 'px'
      ele.style.height = endHeight + 'px'

      mask.current!.innerText = `${Math.round(endWidth)}px * ${Math.round(endHeight)}px`
    })

    const unUp = fromEvent(document, 'mouseup').subscribe(() => {
      component.state.width = endWidth + 'px'
      component.state.height = endHeight + 'px'
      docContainer.style.pointerEvents = ''
      unMove.unsubscribe()
      unUp.unsubscribe()
    })
  }

  return withScopedCSS(style, () => {
    return (
      <div class="drag-resize" onClick={selectComponent}>
        <div class="container" ref={ref}>
          {props.children}
        </div>
        <div class={['resize-tool', {
          active: isShow()
        }]}>
          <div class="mask" ref={mask}>{component.state.width}*{component.state.height}</div>
          <div class="btn-group" ref={btnGroup} onMousedown={drag}>
            <button type="button"></button>
            <button type="button"></button>
            <button type="button"></button>
            <button type="button"></button>
            <button type="button"></button>
            <button type="button"></button>
            <button type="button"></button>
            <button type="button"></button>
          </div>
        </div>
      </div>
    )
  })
}
