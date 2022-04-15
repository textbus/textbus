import { Commander, QueryState, FormatValue, Query, QueryStateType } from '@textbus/core'
import { Injector } from '@tanbo/di'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { underlineFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'

export function underlineToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    iconClasses: ['textbus-icon-underline'],
    tooltip: i18n.get('plugins.toolbar.underlineTool.tooltip'),
    keymap: {
      ctrlKey: true,
      key: 'u'
    },
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(underlineFormatter)
    },
    onClick() {
      const state = query.queryFormat(underlineFormatter)
      const b = state.state === QueryStateType.Enabled
      b ? commander.unApplyFormat(underlineFormatter) : commander.applyFormat(underlineFormatter, true)
    }
  }
}

export function underlineTool() {
  return new ButtonTool(underlineToolConfigFactory)
}
