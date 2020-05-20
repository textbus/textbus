import { HandlerType, SelectConfig } from '../help';
import { FormatMatcher } from '../matcher/format.matcher';
import { fontFamilyFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';

export const fontFamilyTool: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '字体',
  mini: true,
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
  match: new FormatMatcher(fontFamilyFormatter),
  highlight(options, p) {
    console.log(p);
    return options[0]
  },
  execCommand: new StyleCommander('fontFamily', fontFamilyFormatter)
};
