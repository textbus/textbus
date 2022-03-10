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
import { useEnterBreaking } from './_utils/single-block-enter'

export const blockComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'BlockComponent',
  setup(data?: ComponentData) {
    const injector = useContext()
    const slots = useSlots(data?.slots || [new Slot([
      ContentType.Text,
      ContentType.InlineComponent,
      ContentType.BlockComponent
    ])])
    useEnterBreaking(injector, slots)
    return {
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, () => {
          return new VElement('div')
        })
      }
    }
  }
})

export const blockComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'DIV'
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    const slot = slotParser(new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ]), element)
    return blockComponent.createInstance(injector, {
      slots: [slot]
    })
  },
  component: blockComponent
}
