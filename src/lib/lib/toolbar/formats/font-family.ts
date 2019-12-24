import { HandlerType, Priority, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const fontFamilyHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '字体',
  priority: Priority.Inline,
  execCommand: new StyleCommander('fontFamily'),
  highlight(options, cacheData) {
    for (const option of options) {
      if (option.value === cacheData.style.value) {
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
      classes: ['tanbo-editor-font-sans-serif'],
      value: '',
      default: true
    }, {
      label: '宋体',
      classes: ['tanbo-editor-font-SimSun'],
      value: 'SimSun'
    }, {
      label: '黑体',
      classes: ['tanbo-editor-font-SimHei'],
      value: 'SimHei'
    }, {
      label: '微软雅黑',
      classes: ['tanbo-editor-font-Microsoft-YaHei'],
      value: 'Microsoft YaHei'
    }, {
      label: '楷体',
      classes: ['tanbo-editor-font-KaiTi'],
      value: 'KaiTi'
    }, {
      label: '仿宋',
      classes: ['tanbo-editor-font-FangSong'],
      value: 'FangSong',
    }, {
      label: 'Arial',
      classes: ['tanbo-editor-font-Arial'],
      value: 'Arial'
    }, {
      label: 'Helvetica',
      classes: ['tanbo-editor-font-Helvetica'],
      value: 'Helvetica'
    }, {
      label: 'Impact',
      classes: ['tanbo-editor-font-Impact'],
      value: 'Impact'
    }, {
      label: 'Times New Roman',
      classes: ['tanbo-editor-font-Times-New-Roman'],
      value: 'Times New Roman'
    }
  ]
};
