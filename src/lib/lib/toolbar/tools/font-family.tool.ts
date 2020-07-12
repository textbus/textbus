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
    classes: ['tbus-font-sans-serif'],
    value: '',
    default: true
  }, {
    label: '宋体',
    classes: ['tbus-font-SimSun'],
    value: 'SimSun'
  }, {
    label: '黑体',
    classes: ['tbus-font-SimHei'],
    value: 'SimHei'
  }, {
    label: '微软雅黑',
    classes: ['tbus-font-Microsoft-YaHei'],
    value: 'Microsoft YaHei'
  }, {
    label: '楷体',
    classes: ['tbus-font-KaiTi'],
    value: 'KaiTi'
  }, {
    label: '仿宋',
    classes: ['tbus-font-FangSong'],
    value: 'FangSong',
  }, {
    label: 'Arial',
    classes: ['tbus-font-Arial'],
    value: 'Arial'
  }, {
    label: 'Helvetica',
    classes: ['tbus-font-Helvetica'],
    value: 'Helvetica'
  }, {
    label: 'Impact',
    classes: ['tbus-font-Impact'],
    value: 'Impact'
  }, {
    label: 'Times New Roman',
    classes: ['tbus-font-Times-New-Roman'],
    value: 'Times New Roman'
  }],
  matcher: new FormatMatcher(fontFamilyFormatter, [PreComponent]),
  highlight(options, data) {
    if (data instanceof FormatAbstractData) {
      for (const option of options) {
        if (option.value === data.style.value) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new StyleCommander('fontFamily', fontFamilyFormatter)
  }
});
