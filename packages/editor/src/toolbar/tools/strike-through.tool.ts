import { Commander, QueryState, FormatValue, Query, QueryStateType } from '@textbus/core'
import { Injector } from '@tanbo/di'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { strikeThroughFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'

export function strikeThroughToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    iconClasses: ['textbus-icon-strikethrough'],
    tooltip: i18n.get('plugins.toolbar.strikeThrough.tooltip'),
    keymap: {
      ctrlKey: true,
      key: 'd'
    },
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(strikeThroughFormatter)
    },
    onClick() {
      const state = query.queryFormat(strikeThroughFormatter)
      const b = state.state === QueryStateType.Enabled
      b ? commander.unApplyFormat(strikeThroughFormatter) : commander.applyFormat(strikeThroughFormatter, true)
    }
  }
}

export function strikeThroughTool() {
  return new ButtonTool(strikeThroughToolConfigFactory)
}
