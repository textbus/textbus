import {
  ContentType,
  defineComponent,
  onInsert, onSlotRemove,
  Slot,
  SlotLiteral,
  SlotRender,
  TBSelection,
  Translator,
  useContext,
  useSlots,
  VElement
} from '@textbus/core'
import { EDITOR_OPTIONS } from '@textbus/browser'

import { paragraphComponent } from './components/paragraph.component'
import { EditorOptions } from './types'

export const rootComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'RootComponent',
  transform(translator: Translator, stateLiteral: SlotLiteral): Slot {
    return translator.createSlot(stateLiteral)
  },
  setup(slot?: Slot) {
    const injector = useContext()
    const selection = injector.get(TBSelection)
    const options = injector.get(EDITOR_OPTIONS) as EditorOptions

    const slots = useSlots([slot || new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])], () => {
      return new Slot([
        ContentType.Text,
        ContentType.BlockComponent,
        ContentType.InlineComponent
      ])
    })

    onInsert(ev => {
      if (typeof ev.data.content === 'string' || ev.data.content.type !== ContentType.BlockComponent) {
        const p = paragraphComponent.createInstance(injector)
        const slot = p.slots.get(0)!
        slot.insert(ev.data.content)
        ev.target.insert(p)
        selection.setLocation(slot, slot.index)
        ev.preventDefault()
      }
    })

    onSlotRemove(ev => {
      ev.preventDefault()
    })

    return {
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, () => {
          return new VElement('div', {
            'textbus-document': 'true',
            'data-placeholder': slots.get(0)?.isEmpty ? options.placeholder || '' : ''
          })
        })
      },
      toJSON() {
        return slots.get(0)!.toJSON()
      }
    }
  }
})
