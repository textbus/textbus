import { Injector } from '@tanbo/di'
import { Query, QueryState, QueryStateType, Commander, FormatValue } from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { subscriptFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'

export function subscriptToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    iconClasses: ['textbus-icon-subscript'],
    tooltip: i18n.get('plugins.tooltip.subscript.tooltip'),
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(subscriptFormatter)
    },
    onClick() {
      const state = query.queryFormat(subscriptFormatter)
      const b = state.state === QueryStateType.Enabled
      b ? commander.unApplyFormat(subscriptFormatter) : commander.applyFormat(subscriptFormatter, true)
    }
  }
}

export const subscriptTool = new ButtonTool(subscriptToolConfigFactory)
