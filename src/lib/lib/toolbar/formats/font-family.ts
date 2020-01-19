import { HandlerType, Priority, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const fontFamilyHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '字体',
  priority: Priority.Inline,
  execCommand: new StyleCommander('fontFamily'),
  highlight(options, abstractData) {
    for (const option of options) {
      if (option.value === abstractData.style.value) {
        return option;
      }
    }
  },
  editable: {
    styleName: 'fontFamily'
  },
  match: {
    styles: {
      fontFamily: ['sans-serif', 'SimSun', 'SimHei', 'Microsoft YaHei', 'KaiTi', 'FangSong', 'Arial', 'Times New Roman']
    },
    noInTags: ['pre']
  },
  options: [
    {
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
    }
  ]
};
