import { Injector } from '@tanbo/di'
import { Query, QueryState, QueryStateType, Commander, FormatValue } from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { superscriptFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'

export function superscriptToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    iconClasses: ['textbus-icon-superscript'],
    tooltip: i18n.get('plugins.toolbar.superscript.tooltip'),
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(superscriptFormatter)
    },
    onClick() {
      const state = query.queryFormat(superscriptFormatter)
      const b = state.state === QueryStateType.Enabled
      b ? commander.unApplyFormat(superscriptFormatter) : commander.applyFormat(superscriptFormatter, true)
    }
  }
}

export const superscriptTool = new ButtonTool(superscriptToolConfigFactory)
