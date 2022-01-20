import { Injector } from '@tanbo/di'
import { ComponentInstance, ContentType, defineComponent, Translator, useRef, useState, VElement } from '@textbus/core'
import { ComponentLoader } from '@textbus/browser'

import { useDragResize } from './_utils/drag-resize'

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
  transform(translator: Translator, state: VideoState): VideoState {
    return state
  },
  setup(state?: VideoState) {
    state = state || {
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
      render() {
        const el = new VElement('video')
        el.attrs.set('src', state!.src)
        el.attrs.set('autoplay', state!.autoplay)
        el.attrs.set('controls', state!.controls)
        if (state!.width) {
          el.styles.set('width', state!.width)
        }
        if (state!.height) {
          el.styles.set('height', state!.height)
        }
        return el
      },
      toJSON() {
        return {
          ...state
        }
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
      src: element.src,
      width: element.style.width || element.width + '',
      height: element.style.height || element.height + '',
      autoplay: element.autoplay,
      controls: element.controls
    })
  },
  component: videoComponent
}
