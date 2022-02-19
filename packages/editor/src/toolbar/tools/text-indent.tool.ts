import { Injector } from '@tanbo/di'
import {
  Commander,
  QueryState,
  Query,
  FormatValue
} from '@textbus/core'

import { SelectTool, SelectToolConfig } from '../toolkit/_api'
import { textIndentFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'

export function textIndentToolConfigFactory(injector: Injector): SelectToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    tooltip: i18n.get('plugins.toolbar.textIndentTool.tooltip'),
    iconClasses: ['textbus-icon-text-indent'],
    mini: true,
    options: [{
      label: '0x',
      value: '0',
      classes: ['textbus-toolbar-text-indent-0'],
      default: true
    }, {
      label: '1x',
      value: '1em',
      classes: ['textbus-toolbar-text-indent-1'],
    }, {
      label: '2x',
      classes: ['textbus-toolbar-text-indent-2'],
      value: '2em',
    }, {
      label: '4x',
      classes: ['textbus-toolbar-text-indent-4'],
      value: '4em'
    }],
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(textIndentFormatter)
    },
    onChecked(value: string) {
      value === '0' ? commander.unApplyFormat(textIndentFormatter) : commander.applyFormat(textIndentFormatter, value)
    }
  }
}

export function textIndentTool() {
  return new SelectTool(textIndentToolConfigFactory)
}
