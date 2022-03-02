import { Injector } from '@tanbo/di'
import {
  Commander,
  ComponentInstance,
  ContentType,
  QueryState,
  QueryStateType,
  Slot,
  Selection,
  Translator
} from '@textbus/core'

import { listComponent, ListComponentInstance, paragraphComponent } from '../../../components/_api'

export function listToolCreator(injector: Injector, type: 'ul' | 'ol') {
  const selection = injector.get(Selection)
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
      const range = selection.getSlotRangeInCommonAncestorComponent()!
      const parent = component.parent!
      const index = parent.indexOf(component)
      const segment = component.methods.split!(range.startIndex, range.endIndex)
      const components: ComponentInstance[] = []
      if (segment.before.length) {
        components.push(listComponent.createInstance(injector, {
          state: type,
          slots: segment.before
        }))
      }

      const transformed = commander.extractSlots([
        ContentType.Text,
        ContentType.InlineComponent
      ], true)

      transformed.slots.forEach(slot => {
        components.push(paragraphComponent.createInstance(injector, slot))
        if (slot === transformed.range.startSlot) {
          selection.setStart(slot, transformed.range.startOffset!)
        }
        if (slot === transformed.range.endSlot) {
          selection.setEnd(slot, transformed.range.endOffset!)
        }
      })
      if (segment.after.length) {
        components.push(listComponent.createInstance(injector, {
          state: type,
          slots: segment.after
        }), component)
      }
      parent.retain(index)
      components.forEach(c => parent.insert(c))
      commander.remove(component)
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
        state: type,
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
