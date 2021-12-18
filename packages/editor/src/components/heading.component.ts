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

export interface HeadingComponentLiteral {
  type: string
  slot: SlotLiteral
}

export interface HeadingComponentState {
  type: string
  slot?: Slot
}

export const headingComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'HeadingComponent',
  transform(translator: Translator, state: HeadingComponentLiteral): HeadingComponentState {
    return {
      type: state.type,
      slot: translator.createSlot(state.slot)
    }
  },
  setup(state: HeadingComponentState) {
    const injector = useContext()
    const slots = useSlots([state?.slot || new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ])], state => {
      return new Slot(state.schema)
    })
    useEnterBreaking(injector, slots)

    return {
      type: state.type,
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, () => {
          return new VElement(state.type)
        })
      },
      toJSON() {
        return {
          type: state.type,
          slot: slots.get(0)!.toJSON()
        }
      }
    }
  }
})

export const headingComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return /^h[1-6]$/i.test(element.tagName)
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    const slot = slotParser(new Slot([
      ContentType.InlineComponent,
      ContentType.Text
    ]), element)
    return headingComponent.createInstance(injector, {
      slot,
      type: element.tagName.toLowerCase()
    })
  },
  component: headingComponent
}
