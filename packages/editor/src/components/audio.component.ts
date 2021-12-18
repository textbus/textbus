import { Injector } from '@tanbo/di'
import { ComponentInstance, ContentType, defineComponent, Translator, useState, VElement } from '@textbus/core'
import { ComponentLoader } from '@textbus/browser'

export interface AudioState {
  src: string
  autoplay: boolean
  controls: boolean
}

export const audioComponent = defineComponent({
  name: 'AudioComponent',
  type: ContentType.InlineComponent,
  transform(translator: Translator, state: AudioState): AudioState {
    return state
  },
  setup(state?: AudioState) {
    state = state || {
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
        const el = new VElement('audio')
        el.attrs.set('src', state!.src)
        el.attrs.set('autoplay', state!.autoplay)
        el.attrs.set('controls', state!.controls)
        return el
      },
      toJSON() {
        return {
          ...state
        }
      },
      mergeProps(props: Partial<AudioState>) {
        controller.update({
          ...state!,
          ...props
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
      src: element.src,
      autoplay: element.autoplay,
      controls: element.controls
    })
  },
  component: audioComponent
}
