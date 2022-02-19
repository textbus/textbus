import { Commander, FormatValue, Query, QueryState } from '@textbus/core'
import { SelectTool, SelectToolConfig } from '../toolkit/_api'
import { Injector } from '@tanbo/di'
import { I18n } from '../../i18n'
import { fontFamilyFormatter } from '../../formatters/_api'

export function fontFamilyToolConfigFactory(injector: Injector): SelectToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    tooltip: i18n.get('plugins.toolbar.fontFamilyTool.tooltip'),
    options: [{
      label: i18n.get('plugins.toolbar.fontFamilyTool.defaultFamilyText'),
      classes: ['textbus-toolbar-font-family-inherit'],
      value: '',
      default: true
    }, {
      label: '宋体',
      classes: ['textbus-toolbar-font-family-SimSun'],
      value: 'SimSun'
    }, {
      label: '黑体',
      classes: ['textbus-toolbar-font-family-SimHei'],
      value: 'SimHei'
    }, {
      label: '楷体',
      classes: ['textbus-toolbar-font-family-KaiTi'],
      value: 'KaiTi'
    }, {
      label: '仿宋',
      classes: ['textbus-toolbar-font-family-FangSong'],
      value: 'FangSong',
    }, {
      label: '隶书',
      classes: ['textbus-toolbar-font-family-SimLi'],
      value: 'SimLi'
    }, {
      label: 'Andale Mono',
      classes: ['textbus-toolbar-font-family-andale-mono'],
      value: 'Andale Mono'
    }, {
      label: 'Arial',
      classes: ['textbus-toolbar-font-family-Arial'],
      value: 'Arial'
    }, {
      label: 'Helvetica',
      classes: ['textbus-toolbar-font-family-Helvetica'],
      value: 'Helvetica'
    }, {
      label: 'Impact',
      classes: ['textbus-toolbar-font-family-Impact'],
      value: 'Impact'
    }, {
      label: 'Times New Roman',
      classes: ['textbus-toolbar-font-family-Times-New-Roman'],
      value: 'Times New Roman'
    }],
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(fontFamilyFormatter)
    },
    onChecked(value: string) {
      value ? commander.applyFormat(fontFamilyFormatter, value) : commander.unApplyFormat(fontFamilyFormatter)
    }
  }
}

export function fontFamilyTool() {
  return new SelectTool(fontFamilyToolConfigFactory)
}
