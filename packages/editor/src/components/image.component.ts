import { Injector } from '@tanbo/di'
import {
  ComponentInstance,
  ContentType,
  defineComponent,
  Translator,
  useRef,
  useState,
  VElement
} from '@textbus/core'
import { ComponentLoader } from '@textbus/browser'
import { useDragResize } from './_utils/drag-resize'

export interface ImageComponentLiteral {
  src: string
  maxWidth?: string;
  maxHeight?: string;
  width?: string
  height?: string
  margin?: string
  float?: string
}

export const imageComponent = defineComponent({
  type: ContentType.InlineComponent,
  name: 'ImgComponent',
  transform(translator: Translator, state: ImageComponentLiteral): ImageComponentLiteral {
    return state
  },
  setup(state: ImageComponentLiteral) {
    const changeController = useState(state)

    changeController.onChange.subscribe(v => {
      state = v
    })

    const ref = useRef<HTMLImageElement>()

    useDragResize(ref, rect => {
      changeController.update({
        ...state,
        ...rect
      })
    })

    return {
      render() {
        return new VElement('img', {
          ref,
          src: state.src,
          style: {
            width: state.width,
            height: state.height,
            maxWidth: state.maxWidth,
            maxHeight: state.maxHeight,
            margin: state.margin,
            float: state.float
          }
        })
      },
      toJSON() {
        return {
          ...state
        }
      }
    }
  }
})

export const imageComponentLoader: ComponentLoader = {
  resources: {
    styles: ['img{max-width: 100%}']
  },
  match(element: HTMLElement): boolean {
    return element.tagName === 'IMG'
  },
  read(element: HTMLElement, injector: Injector): ComponentInstance {
    const style = element.style
    return imageComponent.createInstance(injector, {
      src: element.getAttribute('src') || '',
      width: style.width,
      height: style.height,
      margin: style.margin,
      float: style.float,
      maxWidth: style.maxWidth,
      maxHeight: style.maxHeight
    })
  },
  component: imageComponent
}
