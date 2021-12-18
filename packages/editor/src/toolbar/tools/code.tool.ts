import { Injector } from '@tanbo/di'
import { Commander, Query, QueryState, QueryStateType, FormatValue } from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { codeFormatter } from '../../formatters/_api'

export function codeToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    iconClasses: ['textbus-icon-code'],
    tooltip: i18n.get('plugins.toolbar.codeTool.tooltip'),
    keymap: {
      key: ';',
      ctrlKey: true,
    },
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(codeFormatter)
    },
    onClick() {
      const state = query.queryFormat(codeFormatter)
      const b = state.state === QueryStateType.Enabled
      b ? commander.unApplyFormat(codeFormatter) : commander.applyFormat(codeFormatter, true)
    }
  }
}

export const codeTool = new ButtonTool(codeToolConfigFactory)
