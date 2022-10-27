import { Commander, FormatValue, Query, QueryState } from '@textbus/core'
import { Injector } from '@tanbo/di'

import { SelectTool, SelectToolConfig } from '../toolkit/_api'
import { fontSizeFormatter, textAlignFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'

export function verticalAlignToolConfigFactory(injector: Injector): SelectToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  const childI18n = i18n.getContext('plugins.toolbar.verticalAlignTool')
  return {
    tooltip: childI18n.get('tooltip'),
    mini: true,
    options: [{
      label: childI18n.get('baseline'),
      value: 'baseline',
      default: true
    }, {
      label: childI18n.get('super'),
      value: 'super'
    }, {
      label: childI18n.get('sub'),
      value: 'sub'
    }, {
      label: childI18n.get('top'),
      value: 'top'
    }, {
      label: childI18n.get('middle'),
      value: 'middle'
    }, {
      label: childI18n.get('bottom'),
      value: 'bottom'
    }, {
      label: childI18n.get('textTop'),
      value: 'text-top'
    }, {
      label: childI18n.get('textBottom'),
      value: 'text-bottom'
    }],
    queryState(): QueryState<FormatValue> {
      return query.queryAttribute(textAlignFormatter)
    },
    onChecked(value: string) {
      commander.applyFormat(fontSizeFormatter, value)
    }
  }
}

export function verticalAlignTool() {
  return new SelectTool(verticalAlignToolConfigFactory)
}
