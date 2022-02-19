import { Injector } from '@tanbo/di'
import { Commander, FormatValue, Query, QueryState } from '@textbus/core'

import { SelectTool, SelectToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { letterSpacingFormatter } from '../../formatters/_api'

export function letterSpacingToolConfigFactory(injector: Injector): SelectToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    tooltip: i18n.get('plugins.toolbar.letterSpacingTool.tooltip'),
    iconClasses: ['textbus-icon-letter-spacing'],
    mini: true,
    options: [{
      label: i18n.get('plugins.toolbar.letterSpacingTool.defaultValueLabel'),
      value: '',
      classes: ['textbus-toolbar-letter-spacing-inherit'],
      default: true
    }, {
      label: '0px',
      value: '0px',
      classes: ['textbus-toolbar-letter-spacing-0'],
    }, {
      label: '1px',
      classes: ['textbus-toolbar-letter-spacing-1'],
      value: '1px',
    }, {
      label: '2px',
      classes: ['textbus-toolbar-letter-spacing-2'],
      value: '2px',
    }, {
      label: '3px',
      classes: ['textbus-toolbar-letter-spacing-3'],
      value: '3px',
    }, {
      label: '4px',
      classes: ['textbus-toolbar-letter-spacing-4'],
      value: '4px',
    }, {
      label: '5px',
      classes: ['textbus-toolbar-letter-spacing-5'],
      value: '5px',
    }],
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(letterSpacingFormatter)
    },
    onChecked(value: string) {
      if (value) {
        commander.applyFormat(letterSpacingFormatter, value)
      } else {
        commander.unApplyFormat(letterSpacingFormatter)
      }
    }
  }
}

export function letterSpacingTool() {
  return new SelectTool(letterSpacingToolConfigFactory)
}
