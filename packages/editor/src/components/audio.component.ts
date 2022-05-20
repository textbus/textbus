import { Injector } from '@tanbo/di'
import {
  ComponentData,
  ComponentInstance,
  ContentType,
  defineComponent,
  jsx,
  useState,
} from '@textbus/core'
import { ComponentLoader } from '@textbus/browser'

export interface AudioState {
  src: string
  autoplay: boolean
  controls: boolean
}

export const audioComponent = defineComponent({
  name: 'AudioComponent',
  type: ContentType.InlineComponent,
  setup(data?: ComponentData<AudioState>) {
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
      render() {
        const el = jsx('audio')
        el.attrs.set('src', state!.src)
        el.attrs.set('autoplay', state!.autoplay)
        el.attrs.set('controls', state!.controls)
        return el
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
    return element.nodeName.toLowerCase() === 'video'
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
  component: audioComponent
}
