import { Injector } from '@tanbo/di'
import {
  Commander,
  QueryState,
  Query,
  FormatValue
} from '@textbus/core'

import { SelectTool, SelectToolConfig } from '../toolkit/select-tool'
import { fontSizeFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'

export function fontSizeToolConfigFactory(injector: Injector): SelectToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    tooltip: i18n.get('plugins.toolbar.fontSizeTool.tooltip'),
    iconClasses: ['textbus-icon-font-size'],
    mini: true,
    options: [{
      label: i18n.get('plugins.toolbar.fontSizeTool.defaultSizeText'),
      classes: ['textbus-toolbar-font-size-inherit'],
      value: '',
      default: true
    }, {
      label: '12px',
      classes: ['textbus-toolbar-font-size-12'],
      value: '12px'
    }, {
      label: '13px',
      classes: ['textbus-toolbar-font-size-13'],
      value: '13px'
    }, {
      label: '14px',
      classes: ['textbus-toolbar-font-size-14'],
      value: '14px'
    }, {
      label: '15px',
      classes: ['textbus-toolbar-font-size-15'],
      value: '15px',
    }, {
      label: '16px',
      classes: ['textbus-toolbar-font-size-16'],
      value: '16px'
    }, {
      label: '18px',
      classes: ['textbus-toolbar-font-size-18'],
      value: '18px'
    }, {
      label: '20px',
      classes: ['textbus-toolbar-font-size-20'],
      value: '20px'
    }, {
      label: '24px',
      classes: ['textbus-toolbar-font-size-24'],
      value: '24px'
    }, {
      label: '36px',
      classes: ['textbus-toolbar-font-size-36'],
      value: '36px'
    }, {
      label: '48px',
      classes: ['textbus-toolbar-font-size-48'],
      value: '48px'
    }],
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(fontSizeFormatter)
    },
    onChecked(value: string) {
      !value ? commander.unApplyFormat(fontSizeFormatter) : commander.applyFormat(fontSizeFormatter, value)
    }
  }
}

export const fontSizeTool = new SelectTool(fontSizeToolConfigFactory)
