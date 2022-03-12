import { fromEvent } from '@tanbo/stream'
import { Injector } from '@tanbo/di'
import {
  ContentType,
  defineComponent,
  onContentInsert,
  onSlotRemove,
  Slot,
  SlotRender,
  Selection,
  useContext,
  useSlots,
  VElement, onDestroy, useRef, onEnter, ComponentInstance, ComponentData
} from '@textbus/core'
import { ComponentLoader, EDITABLE_DOCUMENT, EDITOR_OPTIONS, SlotParser } from '@textbus/browser'

import { paragraphComponent } from './components/paragraph.component'
import { EditorOptions } from './types'

export const rootComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'RootComponent',
  setup(data?: ComponentData<any>) {
    const injector = useContext()
    const selection = injector.get(Selection)
    const options = injector.get(EDITOR_OPTIONS) as EditorOptions
    const editableDocument = injector.get(EDITABLE_DOCUMENT)

    const slots = useSlots(data?.slots || [new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])])

    onContentInsert(ev => {
      if (typeof ev.data.content === 'string' || ev.data.content.type !== ContentType.BlockComponent) {
        const p = paragraphComponent.createInstance(injector)
        const slot = p.slots.get(0)!
        slot.insert(ev.data.content)
        ev.target.insert(p)
        selection.setPosition(slot, slot.index)
        ev.preventDefault()
      }
    })

    onEnter((ev) => {
      const p = paragraphComponent.createInstance(injector)
      const slot = slots.get(0)!
      slot.insert(p)
      selection.setPosition(p.slots.get(0)!, 0)
      ev.preventDefault()
    })

    onSlotRemove(ev => {
      ev.preventDefault()
    })

    const docContainer = useRef<HTMLElement>()

    const sub = fromEvent<MouseEvent>(editableDocument, 'click').subscribe(ev => {
      if (ev.clientY > docContainer.current!.getBoundingClientRect().height) {
        const slot = slots.get(0)!
        const lastContent = slot.getContentAtIndex(slot.length - 1)
        if (!slot.isEmpty && typeof lastContent !== 'string' && lastContent.name !== paragraphComponent.name) {
          const index = slot.index
          slot.retain(slot.length)
          const p = paragraphComponent.createInstance(injector)
          slot.insert(p)
          slot.retain(index)
          selection.setPosition(p.slots.get(0)!, 0)
        }
      }
    })

    onDestroy(() => {
      sub.unsubscribe()
    })

    return {
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, () => {
          return new VElement('div', {
            'textbus-document': 'true',
            'ref': docContainer,
            'data-placeholder': slots.get(0)?.isEmpty ? options.placeholder || '' : ''
          })
        })
      }
    }
  }
})

export const rootComponentLoader: ComponentLoader = {
  component: rootComponent,
  match(): boolean {
    return true
  },
  read(element: HTMLElement, context: Injector, slotParser: SlotParser): ComponentInstance {
    const slot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent,
      ContentType.InlineComponent
    ])
    slotParser(slot, element)
    return rootComponent.createInstance(context, {
      state: null,
      slots: [slot]
    })
  }
}
