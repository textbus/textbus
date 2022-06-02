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

import { listComponent, ListComponentExtends, paragraphComponent } from '../../../components/_api'

export function listToolCreator(injector: Injector, type: 'ul' | 'ol') {
  const selection = injector.get(Selection)
  const translator = injector.get(Translator)
  const commander = injector.get(Commander)
  const instance = {
    queryState(): QueryState<ComponentInstance<ListComponentExtends>> {
      const component = selection.commonAncestorComponent
      if (component?.name === listComponent.name && (component.extends as ListComponentExtends).type === type) {
        return {
          state: QueryStateType.Enabled,
          value: component as ComponentInstance<ListComponentExtends>
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
    toParagraph(component: ComponentInstance<ListComponentExtends>) {
      const range = selection.getSlotRangeInCommonAncestorComponent()!
      const parent = component.parent!
      const index = parent.indexOf(component)
      const segment = component.extends.split!(range.startIndex, range.endIndex)
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
        components.push(paragraphComponent.createInstance(injector, {
          slots: [slot]
        }))
        if (slot === transformed.range.focusSlot) {
          selection.setAnchor(slot, transformed.range.focusOffset!)
        }
        if (slot === transformed.range.anchorSlot) {
          selection.setFocus(slot, transformed.range.anchorOffset!)
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
          selection.setAnchor(i.slot, i.startIndex)
        }
        if (i.slot === selection.endSlot && i.endIndex >= selection.endOffset!) {
          endSlot = slot
          endOffset = selection.endOffset! - i.startIndex
          selection.setFocus(i.slot, i.endIndex)
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

      selection.setAnchor(startSlot, startOffset)
      selection.setFocus(endSlot, endOffset)
    }
  }
  return instance
}
