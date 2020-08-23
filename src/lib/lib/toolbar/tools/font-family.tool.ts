import { FormatMatcher } from '../matcher/format.matcher';
import { fontFamilyFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatAbstractData } from '../../core/format-abstract-data';
import { Toolkit } from '../toolkit/toolkit';
import { PreComponent } from '../../components/pre.component';
import { SelectConfig } from '../toolkit/select.handler';

export const fontFamilyToolConfig: SelectConfig = {
  tooltip: '字体',
  options: [{
    label: 'sans-serif',
    classes: ['textbus-toolbar-font-family-sans-serif'],
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
  highlight(options, data) {
    if (data instanceof FormatAbstractData) {
      for (const option of options) {
        if (option.value === data.styles.get('fontFamily')) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new StyleCommander('fontFamily', fontFamilyFormatter)
  }
};
export const fontFamilyTool = Toolkit.makeSelectTool(fontFamilyToolConfig);
