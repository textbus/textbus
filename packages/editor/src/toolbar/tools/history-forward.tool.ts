import { Injector } from '@tanbo/di'
import { QueryState, History, QueryStateType } from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'

export function historyForwardToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const history = injector.get(History)
  return {
    iconClasses: ['textbus-icon-history-forward'],
    tooltip: i18n.get('plugins.toolbar.historyForwardTool.tooltip'),
    keymap: {
      ctrlKey: true,
      shiftKey: true,
      key: 'z'
    },
    queryState(): QueryState<boolean> {
      return {
        state: history.canForward ? QueryStateType.Normal : QueryStateType.Disabled,
        value: null
      }
    },
    onClick() {
      history.forward()
    }
  }
}

export const historyForwardTool = new ButtonTool(historyForwardToolConfigFactory)
