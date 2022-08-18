import { Injector } from '@tanbo/di'
import {
  ComponentInitData,
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

export const blockComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'BlockComponent',
  setup(data?: ComponentInitData) {
    const injector = useContext()
    const slots = useSlots(data?.slots || [new Slot([
      ContentType.Text,
      ContentType.InlineComponent,
      ContentType.BlockComponent
    ])])
    if (!slots.length) {
      slots.push(new Slot([
        ContentType.Text,
        ContentType.InlineComponent,
        ContentType.BlockComponent
      ]))
    }
    useEnterBreaking(injector, slots)
    return {
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, () => {
          return <div/>
        })
      }
    }
  }
})

export const blockComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'DIV'
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser) {
    const slot = slotParser(new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ]), element)
    const content = slot.sliceContent()
    const isAllContent = content.some(i => {
      return typeof i === 'string' || i.type === ContentType.InlineComponent
    })
    if (isAllContent) {
      return blockComponent.createInstance(injector, {
        slots: [slot]
      })
    }
    return slot
  },
}
