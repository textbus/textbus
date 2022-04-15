import { Injector } from '@tanbo/di'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { listToolCreator } from './_utils/list-tool-creator'
import { I18n } from '../../i18n'

export function olToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  return {
    iconClasses: ['textbus-icon-list-numbered'],
    tooltip: i18n.get('plugins.toolbar.olTool.tooltip'),
    keymap: {
      shiftKey: true,
      ctrlKey: true,
      key: 'o'
    },
    ...listToolCreator(injector, 'ol')
  }
}

export function olTool() {
  return new ButtonTool(olToolConfigFactory)
}
