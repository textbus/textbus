import { Injector } from '@tanbo/di'
import { Commander, Query, QueryState, QueryStateType, Selection } from '@textbus/core'

import { linkFormatter } from '../../formatters/_api'
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'

export function unlinkToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const selection = injector.get(Selection)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    tooltip: i18n.get('plugins.toolbar.unlinkTool.tooltip'),
    iconClasses: ['textbus-icon-unlink'],
    queryState(): QueryState<any> {
      const state = query.queryFormat(linkFormatter)
      if (state.state === QueryStateType.Normal) {
        state.state = QueryStateType.Disabled
      }
      return state
    },
    onClick() {
      if (selection.isCollapsed) {
        const slot = selection.startSlot!
        slot.getFormatRangesByFormatter(linkFormatter, 0, slot.length).filter(f => {
          return f.startIndex < selection.startOffset! && f.endIndex >= selection.endOffset!
        }).forEach(f => {
          slot.retain(f.startIndex)
          slot.retain(f.endIndex, linkFormatter, null)
        })
      } else {
        commander.unApplyFormat(linkFormatter)
      }
    }
  }
}

export const unlinkTool = new ButtonTool(unlinkToolConfigFactory)
