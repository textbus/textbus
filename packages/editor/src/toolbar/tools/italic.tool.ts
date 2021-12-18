import { Commander, QueryState, FormatValue, Query, QueryStateType } from '@textbus/core'
import { Injector } from '@tanbo/di'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { italicFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'

export function italicToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    iconClasses: ['textbus-icon-italic'],
    tooltip: i18n.get('plugins.toolbar.italicTool.tooltip'),
    keymap: {
      ctrlKey: true,
      key: 'i'
    },
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(italicFormatter)
    },
    onClick() {
      const state = query.queryFormat(italicFormatter)
      const b = state.state === QueryStateType.Enabled
      b ? commander.unApplyFormat(italicFormatter) : commander.applyFormat(italicFormatter, true)
    }
  }
}

export const italicTool = new ButtonTool(italicToolConfigFactory)
