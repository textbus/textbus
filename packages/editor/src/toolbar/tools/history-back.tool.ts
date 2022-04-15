import { Injector } from '@tanbo/di'
import { QueryState, History, QueryStateType } from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'

export function historyBackToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const history = injector.get(History)
  return {
    iconClasses: ['textbus-icon-history-back'],
    tooltip: i18n.get('plugins.toolbar.historyBackTool.tooltip'),
    keymap: {
      ctrlKey: true,
      key: 'z'
    },
    queryState(): QueryState<boolean> {
      return {
        state: history.canBack ? QueryStateType.Normal : QueryStateType.Disabled,
        value: null
      }
    },
    onClick() {
      history.back()
    }
  }
}

export function historyBackTool() {
  return new ButtonTool(historyBackToolConfigFactory)
}
