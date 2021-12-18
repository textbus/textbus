import { Injector } from '@tanbo/di'
import {
  ComponentInstance,
  ContentType,
  defineComponent,
  Slot,
  SlotLiteral,
  SlotRender,
  Translator,
  useSlots,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'

export const blockquoteComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'BlockquoteComponent',
  transform(translator: Translator, state: SlotLiteral): Slot {
    return translator.createSlot(state)
  },
  setup(slot?: Slot) {
    const slots = useSlots([slot || new Slot([
      ContentType.Text,
      ContentType.InlineComponent,
      ContentType.BlockComponent
    ])], state => {
      return new Slot(state.schema)
    })
    return {
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, () => {
          return new VElement('blockquote')
        })
      },
      toJSON() {
        return slots.get(0)!.toJSON()
      }
    }
  }
})

export const blockquoteComponentLoader: ComponentLoader = {
  resources: {
    styles: [`blockquote {padding: 10px 15px; border-left: 10px solid #dddee1; background-color: #f8f8f9; margin: 1em 0; border-radius: 4px;} blockquote>*:first-child{margin-top:0}blockquote>*:last-child{margin-bottom:0}`]
  },
  match(element: HTMLElement): boolean {
    return element.tagName === 'BLOCKQUOTE'
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    const slot = slotParser(new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ]), element)
    return blockquoteComponent.createInstance(injector, slot)
  },
  component: blockquoteComponent
}
