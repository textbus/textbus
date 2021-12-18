import { Injector } from '@tanbo/di'
import { Commander, FormatValue, Query, QueryState, QueryStateType } from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { dirFormatter } from '../../formatters/_api'

export function leftToRightToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    iconClasses: ['textbus-icon-ltr'],
    tooltip: i18n.get('plugins.toolbar.leftToRightTool.tooltip'),
    queryState(): QueryState<FormatValue> {
      const state = query.queryFormat(dirFormatter)
      return {
        state: state.value === 'ltr' ? QueryStateType.Enabled : QueryStateType.Normal,
        value: state.value
      }
    },
    onClick() {
      const state = query.queryFormat(dirFormatter)
      const b = state.value === 'ltr'
      b ? commander.unApplyFormat(dirFormatter) : commander.applyFormat(dirFormatter, true)
    }
  }
}

export const leftToRightTool = new ButtonTool(leftToRightToolConfigFactory)
