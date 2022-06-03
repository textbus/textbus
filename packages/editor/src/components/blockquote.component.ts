import { Injector } from '@tanbo/di'
import {
  ComponentData,
  ComponentInstance,
  ContentType,
  defineComponent,
  jsx,
  Slot,
  SlotRender,
  useSlots,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'

export const blockquoteComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'BlockquoteComponent',
  markdownSupport: {
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
  setup(data?: ComponentData) {
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
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, () => {
          return jsx('blockquote', {
            class: 'tb-blockquote'
          })
        })
      }
    }
  }
})

export const blockquoteComponentLoader: ComponentLoader = {
  resources: {
    styles: ['.tb-blockquote {padding: 10px 15px; border-left: 10px solid #dddee1; background-color: #f8f8f9; margin: 1em 0; border-radius: 4px;} .tb-blockquote>*:first-child{margin-top:0}blockquote>*:last-child{margin-bottom:0}']
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
    return blockquoteComponent.createInstance(injector, {
      slots: [slot]
    })
  },
  component: blockquoteComponent
}
