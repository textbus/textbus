import { Injector } from '@tanbo/di'
import {
  ComponentInstance,
  ComponentMethods,
  ContentType,
  defineComponent,
  onEnter,
  Slot,
  SlotRender,
  Selection,
  useContext,
  useSlots,
  VElement,
  ComponentData
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'

import { paragraphComponent } from './paragraph.component'

export interface SegmentedSlots<T extends Slot = Slot> {
  before: T[]
  middle: T[]
  after: T[]
}

export interface ListComponentInstance extends ComponentMethods {
  type: 'ul' | 'ol',

  split?(startIndex: number, endIndex: number): SegmentedSlots
}

export const listComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'ListComponent',
  setup(data?: ComponentData<'ul' | 'ol'>): ListComponentInstance {
    const injector = useContext()
    const selection = injector.get(Selection)

    const slots = useSlots(data?.slots || [new Slot([
      ContentType.Text,
      ContentType.InlineComponent,
      ContentType.BlockComponent
    ])])

    onEnter(ev => {
      if (ev.target.isEmpty && ev.target === slots.last) {
        const paragraph = paragraphComponent.createInstance(injector)
        const parentComponent = selection.commonAncestorComponent!
        const parentSlot = parentComponent.parent!
        const index = parentSlot.indexOf(parentComponent)
        parentSlot.retain(index + 1)
        if (slots.length > 1) {
          slots.remove(slots.last)
        }
        parentSlot.insert(paragraph)
        selection.setLocation(paragraph.slots.get(0)!, 0)
        ev.preventDefault()
        return
      }
      const nextLi = ev.target.cut(ev.data.index)
      slots.insertAfter(nextLi, ev.target)
      selection.setLocation(nextLi, 0)
      ev.preventDefault()
    })

    return {
      type: data?.state || 'ul',
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return new VElement(data?.state || 'ul', null, slots.toArray().map(i => {
          return slotRender(i, () => {
            return new VElement('li')
          })
        }))
      },
      split(startIndex: number, endIndex: number) {
        return {
          before: slots.slice(0, startIndex),
          middle: slots.slice(startIndex, endIndex),
          after: slots.slice(endIndex)
        }
      }
    }
  }
})

export const listComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'OL' || element.tagName === 'UL'
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    const slots: Slot[] = []

    const childNodes = Array.from(element.childNodes)
    while (childNodes.length) {
      const slot = new Slot([
        ContentType.Text,
        ContentType.BlockComponent,
        ContentType.InlineComponent
      ])
      let first = childNodes.shift()
      let newLi: HTMLElement | null = null
      while (first) {
        if (/^li$/i.test(first.nodeName)) {
          slots.push(slot)
          slotParser(slot, first as HTMLElement)
          break
        }
        if (!newLi) {
          if (first.nodeType === Node.TEXT_NODE && (/^\s+$/.test(first.textContent!) || first.textContent === '')) {
            break
          }
          newLi = document.createElement('li')
        }
        newLi.appendChild(first)
        first = childNodes.shift()
      }
      if (newLi) {
        slots.push(slot)
        slotParser(slot, newLi)
        newLi = null
      }
    }
    return listComponent.createInstance(injector, {
      slots,
      state: element.tagName.toLowerCase() as any
    })
  },
  component: listComponent
}
