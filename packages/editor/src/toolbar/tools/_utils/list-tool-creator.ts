import { Injector } from '@tanbo/di'
import {
  Commander,
  ComponentInstance,
  ContentType,
  QueryState,
  QueryStateType,
  Slot,
  TBSelection,
  Translator
} from '@textbus/core'

import { listComponent, ListComponentInstance, paragraphComponent } from '../../../components/_api'

export function listToolCreator(injector: Injector, type: 'ul' | 'ol') {
  const selection = injector.get(TBSelection)
  const translator = injector.get(Translator)
  const commander = injector.get(Commander)
  const instance = {
    queryState(): QueryState<ComponentInstance<ListComponentInstance>> {
      const component = selection.commonAncestorComponent
      if (component?.name === listComponent.name && (component.methods as ListComponentInstance).type === type) {
        return {
          state: QueryStateType.Enabled,
          value: component as ComponentInstance<ListComponentInstance>
        }
      }

      return {
        state: QueryStateType.Normal,
        value: null
      }
    },
    onClick() {
      const queryState = instance.queryState()

      if (queryState.state === QueryStateType.Normal) {
        instance.toList()
      } else {
        instance.toParagraph(queryState.value!)
      }
    },
    toParagraph(component: ComponentInstance<ListComponentInstance>) {
      const range = selection.getSlotRange()!
      const startSlot = selection.startSlot!
      const endSlot = selection.endSlot!
      const startOffset = selection.startOffset!
      const endOffset = selection.endOffset!
      const segment = component.methods.split!(range.startIndex, range.endIndex)
      if (segment.before.length) {
        commander.insertBefore(listComponent.createInstance(injector, {
          type,
          slots: segment.before
        }), component)
      }

      segment.middle.forEach(slot => {
        commander.insertBefore(paragraphComponent.createInstance(injector, slot), component)
      })
      if (segment.after.length) {
        commander.insertBefore(listComponent.createInstance(injector, {
          type,
          slots: segment.after
        }), component)
      }
      commander.remove(component)

      selection.setStart(startSlot, startOffset)
      selection.setEnd(endSlot, endOffset)
    },
    toList() {
      let startSlot!: Slot
      let startOffset!: number
      let endSlot!: Slot
      let endOffset!: number

      const slots = selection.getBlocks().map(i => {
        const slot = translator.fillSlot(i.slot.toJSON(), new Slot([
          ContentType.BlockComponent,
          ContentType.Text,
          ContentType.InlineComponent
        ])).cut(i.startIndex, i.endIndex)

        if (i.slot === selection.startSlot && i.startIndex <= selection.startOffset!) {
          startSlot = slot
          startOffset = selection.startOffset! - i.startIndex
          selection.setStart(i.slot, i.startIndex)
        }
        if (i.slot === selection.endSlot && i.endIndex >= selection.endOffset!) {
          endSlot = slot
          endOffset = selection.endOffset! - i.startIndex
          selection.setEnd(i.slot, i.endIndex)
        }

        return slot
      })

      commander.delete()
      const component = listComponent.createInstance(injector, {
        type,
        slots
      })
      if (selection.commonAncestorSlot!.isEmpty && selection.commonAncestorComponent!.slots.length === 1) {
        commander.replace(selection.commonAncestorComponent!, component)
      } else {
        commander.insert(component)
      }

      selection.setStart(startSlot, startOffset)
      selection.setEnd(endSlot, endOffset)
    }
  }
  return instance
}
