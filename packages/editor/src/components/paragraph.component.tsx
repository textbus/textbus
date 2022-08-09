import { Injector } from '@tanbo/di'
import {
  ComponentData,
  ComponentInstance,
  ContentType,
  defineComponent,
  Slot,
  SlotRender,
  useContext,
  useSlots,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'
import { useEnterBreaking } from './hooks/single-block-enter'

export const paragraphComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'ParagraphComponent',
  setup(data?: ComponentData) {
    const injector = useContext()
    const slots = useSlots(data?.slots || [new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ])])
    if (!slots.length) {
      slots.push(new Slot([
        ContentType.Text,
        ContentType.InlineComponent
      ]))
    }
    useEnterBreaking(injector, slots)
    return {
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, () => {
          return <p/>
        })
      }
    }
  }
})

export const paragraphComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'P'
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    const slot = slotParser(new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ]), element)
    return paragraphComponent.createInstance(injector, {
      slots: [slot]
    })
  }
}
