import { Commander, FormatValue, Query, QueryState } from '@textbus/core'
import { Injector } from '@tanbo/di'

import { SelectTool, SelectToolConfig } from '../toolkit/_api'
import { fontSizeFormatter, textAlignFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'

export function verticalAlignToolConfigFactory(injector: Injector): SelectToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    tooltip: i18n.get('plugins.toolbar.verticalAlignTool.tooltip'),
    mini: true,
    options: [{
      label: i18n.get('plugins.toolbar.verticalAlignTool.baseline'),
      value: 'baseline',
      default: true
    }, {
      label: i18n.get('plugins.toolbar.verticalAlignTool.super'),
      value: 'super'
    }, {
      label: i18n.get('plugins.toolbar.verticalAlignTool.sub'),
      value: 'sub'
    }, {
      label: i18n.get('plugins.toolbar.verticalAlignTool.top'),
      value: 'top'
    }, {
      label: i18n.get('plugins.toolbar.verticalAlignTool.middle'),
      value: 'middle'
    }, {
      label: i18n.get('plugins.toolbar.verticalAlignTool.bottom'),
      value: 'bottom'
    }, {
      label: i18n.get('plugins.toolbar.verticalAlignTool.textTop'),
      value: 'text-top'
    }, {
      label: i18n.get('plugins.toolbar.verticalAlignTool.textBottom'),
      value: 'text-bottom'
    }],
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(textAlignFormatter)
    },
    onChecked(value: string) {
      commander.applyFormat(fontSizeFormatter, value)
    }
  }
}
export const verticalAlignTool = new SelectTool(verticalAlignToolConfigFactory)
