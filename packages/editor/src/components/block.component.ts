import { Injector } from '@tanbo/di'
import {
  ComponentInstance,
  ContentType, defineComponent,
  Slot, SlotLiteral,
  SlotRender, Translator, useContext,
  useSlots,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'
import { useEnterBreaking } from './_utils/single-block-enter'

export const blockComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'BlockComponent',
  transform(translator: Translator, state: SlotLiteral): Slot {
    return translator.createSlot(state)
  },
  setup(slot?: Slot) {
    const injector = useContext()
    const slots = useSlots([slot || new Slot([
      ContentType.Text,
      ContentType.InlineComponent,
      ContentType.BlockComponent
    ])], state => {
      return new Slot(state.schema)
    })
    useEnterBreaking(injector, slots)
    return {
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, () => {
          return new VElement('div')
        })
      },
      toJSON() {
        return slots.get(0)!.toJSON()
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
    return blockComponent.createInstance(injector, slot)
  },
  component: blockComponent
}
