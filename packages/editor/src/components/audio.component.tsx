import { Injector } from '@tanbo/di'
import {
  ComponentInitData,
  ComponentInstance,
  ContentType,
  defineComponent,
  VElement,
  useState,
} from '@textbus/core'
import { ComponentLoader } from '@textbus/platform-browser'

export interface AudioState {
  src: string
  autoplay: boolean
  controls: boolean
}

export const audioComponent = defineComponent({
  name: 'AudioComponent',
  type: ContentType.InlineComponent,
  setup(data?: ComponentInitData<AudioState>) {
    let state = data?.state || {
      src: '',
      autoplay: false,
      controls: true,
    }

    const controller = useState(state)

    controller.onChange.subscribe(s => {
      state = s
    })

    return {
      render(): VElement {
        return (
          <audio src={state!.src} autoplay={state!.autoplay} controls={state!.controls}></audio>
        )
      },
      toJSON() {
        return {
          ...state!
        }
      },
      mergeProps(props: Partial<AudioState>) {
        state = controller.update(draft => {
          Object.assign(draft, props)
        })
      }
    }
  }
})

export const audioComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'audio'
  },
  read(element: HTMLVideoElement, context: Injector): ComponentInstance {
    return audioComponent.createInstance(context, {
      state: {
        src: element.src,
        autoplay: element.autoplay,
        controls: element.controls
      }
    })
  },
}
