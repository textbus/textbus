import {
  Commander, ContentType,
  FormatValue,
  QueryState,
  QueryStateType,
  Registry,
  Selection, Slot
} from '@textbus/core'
import { VIEW_DOCUMENT } from '@textbus/browser'
import { Injector } from '@tanbo/di'
import { delay, fromEvent, take } from '@tanbo/stream'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { linkFormatter } from '../../formatters/link.formatter'
import { blockComponent } from '../../components/block.component'
import { listComponent } from '../../components/list.component'
import { todolistComponent } from '../../components/todolist.component'
import { headingComponent } from '../../components/heading.component'
import { paragraphComponent } from '../../components/paragraph.component'

export function formatPainterToolConfigFactory(injector: Injector): ButtonToolConfig {
  const selection = injector.get(Selection)
  const commander = injector.get(Commander)
  const doc = injector.get(VIEW_DOCUMENT)
  const i18n = injector.get(I18n)
  const registry = injector.get(Registry)
  let isActive = false
  return {
    iconClasses: ['textbus-icon-brush'],
    tooltip: i18n.get('plugins.toolbar.formatPainterTool.tooltip'),
    queryState(): QueryState<FormatValue> {
      if (isActive) {
        return {
          state: QueryStateType.Enabled,
          value: null
        }
      }
      return {
        state: selection.isSelected ? QueryStateType.Normal : QueryStateType.Disabled,
        value: null
      }
    },
    onClick() {
      if (!selection.isSelected) {
        return
      }
      isActive = true
      const startSlot = selection.startSlot!
      const formats = startSlot.extractFormatsByIndex(selection.startOffset!)
      const parentComponent = startSlot.parent!
      const multipleComponent = [
        listComponent,
        todolistComponent
      ]
      const canTransformComponentNames = [
        paragraphComponent,
        blockComponent,
        listComponent,
        todolistComponent,
        headingComponent
      ].map(i => i.name)
      let componentName = paragraphComponent.name
      let state: any = null
      if (canTransformComponentNames.includes(parentComponent.name)) {
        componentName = parentComponent.name
        state = typeof parentComponent.state === 'object' && parentComponent.state !== null ?
          JSON.parse(JSON.stringify(parentComponent.state)) :
          parentComponent.state
      }

      startSlot.changeMarker.forceMarkChanged()
      const { Text, InlineComponent, BlockComponent } = ContentType
      fromEvent(doc, 'mouseup').pipe(take(1), delay(10)).subscribe(() => {
        isActive = false
        commander.cleanFormats([linkFormatter])
        formats.forEach(i => {
          commander.applyFormat(i[0], i[1])
        })
        commander.transform({
          multipleSlot: multipleComponent.map(i => i.name).includes(componentName),
          target: registry.getComponent(componentName)!,
          slotFactory() {
            return new Slot(componentName === blockComponent.name ? [
              Text,
              InlineComponent,
              BlockComponent
            ] : [
              Text,
              InlineComponent
            ], startSlot.state)
          },
          stateFactory() {
            return state
          }
        })
      })
    }
  }
}

export function formatPainterTool() {
  return new ButtonTool(formatPainterToolConfigFactory)
}
