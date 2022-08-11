import { Injector } from '@tanbo/di'
import { Commander, Query, QueryState, QueryStateType, Selection } from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { blockquoteComponent } from '../../components/blockquote.component'

export function blockquoteToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  const selection = injector.get(Selection)
  return {
    iconClasses: ['textbus-icon-quotes-right'],
    tooltip: i18n.get('plugins.toolbar.blockquoteTool.tooltip'),
    keymap: /win(dows|32|64)/i.test(navigator.userAgent) ? { // windows 下无法触发 ctrl + ' 号 keydown 事件，原因未知
      altKey: true,
      key: '\''
    } : {
      ctrlKey: true,
      key: '\''
    },
    queryState(): QueryState<any> {
      return query.queryComponent(blockquoteComponent)
    },
    onClick() {
      const state = query.queryComponent(blockquoteComponent)
      if (state.state === QueryStateType.Enabled) {
        const current = state.value!
        const parent = current.parent!

        const index = parent.indexOf(current)

        parent.retain(index)

        commander.removeComponent(current)

        current.slots.get(0)!.sliceContent().forEach(i => {
          parent.insert(i)
        })
      } else {
        const block = blockquoteComponent.createInstance(injector)
        const slot = block.slots.get(0)!
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
  }
}

export function blockquoteTool() {
  return new ButtonTool(blockquoteToolConfigFactory)
}
