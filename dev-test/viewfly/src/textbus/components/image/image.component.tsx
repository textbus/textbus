import { Component, ComponentStateLiteral, ContentType, Slot, Textbus } from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { ComponentLoader } from '@textbus/platform-browser'
import { createRef } from '@viewfly/core'

import './image.component.scss'
import { DragResize } from '../../../components/drag-resize/drag-resize'
import { useReadonly } from '../../hooks/use-readonly'
import { useOutput } from '../../hooks/use-output'

export interface ImageComponentState {
  src: string
  width?: string
  height?: string
}

export class ImageComponent extends Component<ImageComponentState> {
  static type = ContentType.InlineComponent
  static componentName = 'ImageComponent'

  static fromJSON(textbus: Textbus, json: ComponentStateLiteral<ImageComponentState>) {
    return new ImageComponent(textbus, {
      ...json
    })
  }

  override getSlots(): Slot[] {
    return []
  }
}

export function ImageView(props: ViewComponentProps<ImageComponent>) {
  const { name, state } = props.component
  const imageRef = createRef<HTMLImageElement>()
  const readonly = useReadonly()
  const output = useOutput()
  return () => {
    if (readonly() || output()) {
      return (
        <div class="xnote-image" ref={props.rootRef} data-component={name}>
          <img alt="" src={state.src} style={{
            width: state.width,
            height: state.height
          }}/>
        </div>
      )
    }
    return (
      <div class="xnote-image" ref={props.rootRef} data-component={name}>
        <DragResize source={imageRef} component={props.component}>
          <img alt="" ref={imageRef} src={state.src} style={{
            width: state.width,
            height: state.height
          }}/>
        </DragResize>
      </div>
    )
  }
}

export const imageComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'IMG' || element.dataset.component === ImageComponent.componentName
  },
  read(element: HTMLElement, textbus: Textbus): Component | Slot | void {
    const img = element instanceof HTMLImageElement ? element : (element.querySelector('img') || document.createElement('img'))
    return new ImageComponent(textbus, {
      src: img.src,
      width: img.style.width || 'auto',
      height: img.style.height || 'auto'
    })
  }
}
