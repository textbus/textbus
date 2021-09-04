import { FormatData } from '@textbus/core';
import { fontFamilyFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { FormatMatcher } from '../matcher/format.matcher';
import { StyleCommander } from '../commands/style.commander';
import { SelectTool, SelectToolConfig } from '../toolkit/_api';

export const fontFamilyToolConfig: SelectToolConfig = {
  tooltip: i18n => i18n.get('plugins.toolbar.fontFamilyTool.tooltip'),
  options: [{
    label: i18n => i18n.get('plugins.toolbar.fontFamilyTool.defaultFamilyText'),
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
    label: '微软雅黑',
    classes: ['textbus-toolbar-font-family-Microsoft-YaHei'],
    value: 'Microsoft YaHei'
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
  matcher: new FormatMatcher(fontFamilyFormatter, [PreComponent]),
  matchOption(data) {
    if (data instanceof FormatData) {
      for (const option of fontFamilyToolConfig.options) {
        if (new RegExp(`^['"]?${option.value}['"]?$`).test(data.styles.get('fontFamily') as string)) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new StyleCommander('fontFamily', fontFamilyFormatter)
  }
};
export const fontFamilyTool = new SelectTool(fontFamilyToolConfig);
