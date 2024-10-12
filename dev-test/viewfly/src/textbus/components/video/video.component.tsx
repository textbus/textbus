import { Component, ComponentStateLiteral, ContentType, Slot, Textbus } from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { ComponentLoader } from '@textbus/platform-browser'
import { createRef } from '@viewfly/core'

import './video.component.scss'
import { DragResize } from '../../../components/drag-resize/drag-resize'
import { useReadonly } from '../../hooks/use-readonly'
import { useOutput } from '../../hooks/use-output'

export interface VideoComponentState {
  src: string
  width?: string
  height?: string
}

export class VideoComponent extends Component<VideoComponentState> {
  static type = ContentType.InlineComponent
  static componentName = 'VideoComponent'

  static fromJSON(textbus: Textbus, json: ComponentStateLiteral<VideoComponentState>) {
    return new VideoComponent(textbus, {
      ...json
    })
  }

  override getSlots() {
    return []
  }
}

export function VideoView(props: ViewComponentProps<VideoComponent>) {
  const { name, state } = props.component
  const videoRef = createRef<HTMLVideoElement>()
  const readonly = useReadonly()
  const output = useOutput()
  return () => {
    if (readonly() || output()) {
      return (
        <div class="xnote-video" ref={props.rootRef} data-component={name}>
          <video ref={videoRef} src={state.src} style={{
            width: state.width,
            height: state.height
          }}/>
        </div>
      )
    }
    return (
      <div ref={props.rootRef} class="xnote-video" data-component={name}>
        <DragResize source={videoRef} component={props.component}>
          <video ref={videoRef} src={state.src} style={{
            width: state.width,
            height: state.height
          }}/>
        </DragResize>
      </div>
    )
  }
}

export const videoComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'VIDEO' || element.dataset.component === VideoComponent.componentName
  },
  read(element: HTMLElement, textbus: Textbus): Component | Slot | void {
    const video = element instanceof HTMLVideoElement ? element : (element.querySelector('video') || document.createElement('video'))
    return new VideoComponent(textbus, {
      src: video.src,
      width: video.style.width || 'auto',
      height: video.style.height || 'auto'
    })
  }
}
