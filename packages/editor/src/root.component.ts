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
  VElement,
  onDestroy,
  useRef,
  onEnter,
  ComponentInstance,
  ComponentData,
  useSelf
} from '@textbus/core'
import { ComponentLoader, VIEW_DOCUMENT, EDITOR_OPTIONS, SlotParser } from '@textbus/browser'

import { paragraphComponent } from './components/paragraph.component'
import { EditorOptions } from './types'

export const rootComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'RootComponent',
  setup(data?: ComponentData<any>) {
    const injector = useContext()
    const selection = injector.get(Selection)
    const options = injector.get(EDITOR_OPTIONS) as EditorOptions
    const docContainer = injector.get(VIEW_DOCUMENT)

    const self = useSelf()

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

    const rootNode = useRef<HTMLElement>()

    const sub = fromEvent<MouseEvent>(docContainer, 'click').subscribe(ev => {
      const rect = rootNode.current!.getBoundingClientRect()
      const firstSlot = slots.first!
      if (ev.clientY > rect.bottom - 30) {
        const lastContent = firstSlot.getContentAtIndex(firstSlot.length - 1)
        if (!firstSlot.isEmpty && typeof lastContent !== 'string' && lastContent.name !== paragraphComponent.name) {
          const index = firstSlot.index
          firstSlot.retain(firstSlot.length)
          const p = paragraphComponent.createInstance(injector)
          firstSlot.insert(p)
          firstSlot.retain(index)
          selection.setPosition(p.slots.get(0)!, 0)
        }
      } else if (ev.target === rootNode.current) {
        let parentComponent = selection.focusSlot!.parent
        while (parentComponent && parentComponent.parentComponent !== self) {
          parentComponent = parentComponent.parentComponent
        }
        if (!parentComponent) {
          return
        }
        const index = firstSlot.indexOf(parentComponent)
        if (index > -1) {
          if (ev.clientX - rect.left < 4) {
            selection.setPosition(firstSlot, index)
            selection.restore()
          } else if (rect.right - ev.clientX < 4) {
            selection.setPosition(firstSlot, index + 1)
            selection.restore()
          }
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
            'ref': rootNode,
            style: {
              padding: '8px 8px 30px'
            },
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
