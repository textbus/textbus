import { FormatMatcher } from '../matcher/format.matcher';
import { fontFamilyFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatAbstractData } from '../../core/format-abstract-data';
import { Toolkit } from '../toolkit/toolkit';
import { PreComponent } from '../../components/pre.component';

export const fontFamilyTool = Toolkit.makeSelectTool({
  tooltip: '字体',
  options: [{
    label: 'sans-serif',
    classes: ['textbus-font-sans-serif'],
    value: '',
    default: true
  }, {
    label: '宋体',
    classes: ['textbus-font-SimSun'],
    value: 'SimSun'
  }, {
    label: '黑体',
    classes: ['textbus-font-SimHei'],
    value: 'SimHei'
  }, {
    label: '微软雅黑',
    classes: ['textbus-font-Microsoft-YaHei'],
    value: 'Microsoft YaHei'
  }, {
    label: '楷体',
    classes: ['textbus-font-KaiTi'],
    value: 'KaiTi'
  }, {
    label: '仿宋',
    classes: ['textbus-font-FangSong'],
    value: 'FangSong',
  }, {
    label: '隶书',
    classes: ['textbus-font-SimLi'],
    value: 'SimLi'
  }, {
    label: 'Andale Mono',
    classes: ['textbus-font-andale-mono'],
    value: 'Andale Mono'
  }, {
    label: 'Arial',
    classes: ['textbus-font-Arial'],
    value: 'Arial'
  }, {
    label: 'Helvetica',
    classes: ['textbus-font-Helvetica'],
    value: 'Helvetica'
  }, {
    label: 'Impact',
    classes: ['textbus-font-Impact'],
    value: 'Impact'
  }, {
    label: 'Times New Roman',
    classes: ['textbus-font-Times-New-Roman'],
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
});
