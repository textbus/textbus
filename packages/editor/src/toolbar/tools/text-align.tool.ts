import { Commander, FormatValue, Query, QueryState } from '@textbus/core'
import { Injector } from '@tanbo/di'

import { SelectTool, SelectToolConfig } from '../toolkit/_api'
import { textAlignFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'

export function textAlignToolConfigFactory(injector: Injector): SelectToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    tooltip: i18n.get('plugins.toolbar.textAlignTool.tooltip'),
    options: [{
      label: i18n.get('plugins.toolbar.textAlignTool.left'),
      iconClasses: ['textbus-icon-paragraph-left'],
      value: 'left',
      keymap: {
        ctrlKey: true,
        key: 'l'
      },
      default: true
    }, {
      label: i18n.get('plugins.toolbar.textAlignTool.right'),
      iconClasses: ['textbus-icon-paragraph-right'],
      value: 'right',
      keymap: {
        ctrlKey: true,
        key: 'r'
      },
    }, {
      label: i18n.get('plugins.toolbar.textAlignTool.center'),
      iconClasses: ['textbus-icon-paragraph-center'],
      value: 'center',
      keymap: {
        ctrlKey: true,
        key: 'e'
      },
    }, {
      label: i18n.get('plugins.toolbar.textAlignTool.justify'),
      iconClasses: ['textbus-icon-paragraph-justify'],
      value: 'justify',
      keymap: {
        ctrlKey: true,
        key: 'j'
      },
    }],
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(textAlignFormatter)
    },
    onChecked(value: string) {
      commander.applyFormat(textAlignFormatter, value)
    }
  }
}

export const textAlignTool = new SelectTool(textAlignToolConfigFactory)
