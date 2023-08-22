import { Injector } from '@tanbo/di'
import {
  ComponentInitData,
  ComponentInstance,
  ContentType,
  defineComponent,
  useRef,
  useState, VElement,
} from '@textbus/core'
import { ComponentLoader } from '@textbus/platform-browser'

import { useDragResize } from './hooks/drag-resize'

export interface VideoState {
  src: string
  autoplay: boolean
  controls: boolean
  width: string
  height: string
}

export const videoComponent = defineComponent({
  name: 'VideoComponent',
  type: ContentType.InlineComponent,
  setup(data?: ComponentInitData<VideoState>) {
    let state = data?.state || {
      src: '',
      autoplay: false,
      controls: true,
      width: '100%',
      height: ''
    }

    const controller = useState(state)

    controller.onChange.subscribe(s => {
      state = s
    })

    const ref = useRef<HTMLVideoElement>()

    useDragResize(ref, rect => {
      state = controller.update(draft => {
        Object.assign(draft, rect)
      })
    })

    return {
      render(): VElement {
        const vNode = <video src={state.src} ref={ref} controls={state.controls} style={{
          width: state.width,
          height: state.height
        }}/>
        if (state.autoplay) {
          vNode.attrs.set('autoPlay', 'autoplay')
        }
        return vNode
      },
      mergeProps(props: Partial<VideoState>) {
        state = controller.update(draft => {
          Object.assign(draft, props)
        })
      }
    }
  }
})

export const videoComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'video'
  },
  read(element: HTMLVideoElement, context: Injector): ComponentInstance {
    return videoComponent.createInstance(context, {
      state: {
        src: element.src,
        width: element.style.width || element.width + '',
        height: element.style.height || element.height + '',
        autoplay: element.autoplay,
        controls: element.controls
      }
    })
  },
}
