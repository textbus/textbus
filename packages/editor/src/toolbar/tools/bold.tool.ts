import { Commander, QueryState, FormatValue, Query, QueryStateType } from '@textbus/core'
import { Injector } from '@tanbo/di'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { boldFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'

export function boldToolConfigFactory(injector: Injector): ButtonToolConfig {
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  const i18n = injector.get(I18n)
  return {
    iconClasses: ['textbus-icon-bold'],
    tooltip: i18n.get('plugins.toolbar.boldTool.tooltip'),
    keymap: {
      ctrlKey: true,
      key: 'b'
    },
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(boldFormatter)
    },
    onClick() {
      const state = query.queryFormat(boldFormatter)
      const b = state.state === QueryStateType.Enabled
      b ? commander.unApplyFormat(boldFormatter) : commander.applyFormat(boldFormatter, true)
    }
  }
}

export function boldTool() {
  return new ButtonTool(boldToolConfigFactory)
}
