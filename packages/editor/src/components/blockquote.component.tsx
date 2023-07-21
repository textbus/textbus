import { Injector } from '@tanbo/di'
import {
  ComponentInitData,
  ComponentInstance,
  ContentType,
  defineComponent,
  Slot,
  SlotRender,
  useSlots,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/platform-browser'

export const blockquoteComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'BlockquoteComponent',
  zenCoding: {
    key: ' ',
    match: /^>$/,
    generateInitData() {
      return {
        slots: [new Slot([
          ContentType.Text,
          ContentType.InlineComponent,
          ContentType.BlockComponent
        ])]
      }
    }
  },
  setup(data?: ComponentInitData) {
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
    return {
      render(slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, children => {
          return <blockquote class="tb-blockquote">{children}</blockquote>
        })
      }
    }
  }
})

export const blockquoteComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'BLOCKQUOTE' || element.tagName === 'DIV' && element.className === 'tb-blockquote'
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    const slot = slotParser(new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ]), element)
    return blockquoteComponent.createInstance(injector, {
      slots: [slot]
    })
  },
}
