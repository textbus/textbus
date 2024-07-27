import { Commander, ContentType, Query, QueryStateType, Selection, Slot, Textbus } from '@textbus/core'
import { inject } from '@viewfly/core'

import { headingAttr } from '../../textbus/attributes/heading.attr'
import { ParagraphComponent } from '../../textbus/components/paragraph/paragraph.component'
import { TableComponent } from '../../textbus/components/table/table.component'
import { TodolistComponent } from '../../textbus/components/todolist/todolist.component'
import { toBlockquote } from '../../textbus/components/blockqoute/blockquote.component'
import { SourceCodeComponent } from '../../textbus/components/source-code/source-code.component'
import { HighlightBoxComponent } from '../../textbus/components/highlight-box/highlight-box.component'
import { toList } from '../../textbus/components/list/list.component'

export function useBlockTransform() {
  const commander = inject(Commander)
  const textbus = inject(Textbus)
  const query = inject(Query)
  const selection = inject(Selection)
  return function (value: string) {
    switch (value) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        commander.applyAttribute(headingAttr, value)
        break
      case 'paragraph':
        commander.unApplyAttribute(headingAttr)
        commander.transform({
          targetType: ParagraphComponent.type,
          slotFactory() {
            return new Slot([
              ContentType.InlineComponent,
              ContentType.Text
            ])
          },
          stateFactory(slots: Slot[]) {
            return slots.map(slot => new ParagraphComponent(textbus, {
              slot
            }))
          }
        })
        break
      case 'table': {
        const table = new TableComponent(textbus)
        if (selection.commonAncestorSlot?.isEmpty && selection.commonAncestorComponent?.name === ParagraphComponent.componentName) {
          commander.replaceComponent(selection.commonAncestorComponent, table)
        } else {
          commander.insert(table)
        }
      }
        break
      case 'todolist':
        commander.unApplyAttribute(headingAttr)
        commander.transform({
          targetType: TodolistComponent.type,
          slotFactory() {
            return new Slot([
              ContentType.InlineComponent,
              ContentType.Text
            ])
          },
          stateFactory(slots: Slot[]) {
            return slots.map(slot => {
              return new TodolistComponent(textbus, {
                checked: false,
                slot
              })
            })
          }
        })
        break
      case 'ol':
      case 'ul':
        toList(textbus, value === 'ol' ? 'OrderedList' : 'UnorderedList')
        break
      case 'blockquote':
        toBlockquote(textbus)
        break
      case 'sourceCode': {
        const state = query.queryComponent(SourceCodeComponent)
        if (state.state === QueryStateType.Enabled) {
          commander.transform({
            targetType: ParagraphComponent.type,
            slotFactory() {
              return new Slot([
                ContentType.InlineComponent,
                ContentType.Text
              ])
            },
            stateFactory(slots: Slot[]) {
              return slots.map(slot => {
                return new ParagraphComponent(textbus, {
                  slot
                })
              })
            }
          })
        } else {
          commander.transform({
            targetType: SourceCodeComponent.type,
            slotFactory() {
              return new Slot([
                ContentType.Text
              ])
            },
            stateFactory(slots: Slot[]) {
              return [new SourceCodeComponent(textbus, {
                lang: '',
                lineNumber: true,
                autoBreak: true,
                slots: slots.map(slot => {
                  slot.cleanFormats()
                  slot.cleanAttributes()
                  return {
                    slot,
                    emphasize: false
                  }
                })
              })]
            }
          })
        }
      }
        break
      case 'highlightBox': {
        const state = query.queryComponent(HighlightBoxComponent)
        if (state.state === QueryStateType.Enabled) {
          const current = state.value!
          const parent = current.parent!

          const index = parent.indexOf(current)

          parent.retain(index)

          commander.removeComponent(current)

          current.__slots__.get(0)!.sliceContent().forEach(i => {
            parent.insert(i)
          })
        } else {
          const block = new HighlightBoxComponent(textbus)
          const slot = block.state.slot
          if (selection.startSlot === selection.endSlot) {
            const parentComponent = selection.startSlot!.parent!
            const parentSlot = parentComponent.parent!
            const position = parentSlot.indexOf(parentComponent)
            slot.insert(parentComponent)
            parentSlot.retain(position)
            parentSlot.insert(block)
          } else {
            const commonAncestorSlot = selection.commonAncestorSlot!
            const scope = selection.getCommonAncestorSlotScope()!
            commonAncestorSlot.cut(scope.startOffset, scope.endOffset).sliceContent().forEach(i => {
              slot.insert(i)
            })
            commonAncestorSlot.retain(scope.startOffset)
            commonAncestorSlot.insert(block)
          }
        }
      }
        break
    }
  }
}
