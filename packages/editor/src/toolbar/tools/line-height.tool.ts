import { Injector } from '@tanbo/di'
import { Commander, FormatValue, Query, QueryState } from '@textbus/core'

import { SelectTool, SelectToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { lineHeightFormatter } from '../../formatters/_api'

export function lineHeightToolConfigFactory(injector: Injector): SelectToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    tooltip: i18n.get('plugins.toolbar.lineHeightTool.tooltip'),
    iconClasses: ['textbus-icon-line-height'],
    mini: true,
    options: [{
      label: i18n.get('plugins.toolbar.lineHeightTool.defaultValueLabel'),
      classes: ['textbus-toolbar-line-height-inherit'],
      value: '',
      default: true
    }, {
      label: '1x',
      classes: ['textbus-toolbar-line-height-1'],
      value: '1em'
    }, {
      label: '1.2x',
      classes: ['textbus-toolbar-line-height-1_2'],
      value: '1.2em'
    }, {
      label: '1.4x',
      classes: ['textbus-toolbar-line-height-1_4'],
      value: '1.4em'
    }, {
      label: '1.6x',
      classes: ['textbus-toolbar-line-height-1_6'],
      value: '1.6em'
    }, {
      label: '1.8x',
      classes: ['textbus-toolbar-line-height-1_8'],
      value: '1.8em'
    }, {
      label: '2x',
      classes: ['textbus-toolbar-line-height-2'],
      value: '2em'
    }, {
      label: '3x',
      classes: ['textbus-toolbar-line-height-3'],
      value: '3em'
    }, {
      label: '4x',
      classes: ['textbus-toolbar-line-height-4'],
      value: '4em'
    }],
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(lineHeightFormatter)
    },
    onChecked(value: string) {
      if (value) {
        commander.applyFormat(lineHeightFormatter, value)
      } else {
        commander.unApplyFormat(lineHeightFormatter)
      }
    }
  }
}
export const lineHeightTool = new SelectTool(lineHeightToolConfigFactory)
