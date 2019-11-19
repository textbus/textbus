import { HandlerType, propertyHandlerPriority, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const fontFamilyHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '字体',
  priority: propertyHandlerPriority,
  execCommand: new StyleCommander('fontFamily'),
  options: [
    {
      label: 'sans-serif',
      classes: ['tanbo-editor-font-sans-serif'],
      match: {
        styles: {fontFamily: ['', 'sans-serif']}
      },
      value: '',
      default: true
    }, {
      label: '宋体',
      classes: ['tanbo-editor-font-SimSun'],
      match: {
        styles: {fontFamily: 'SimSun'}
      },
      value: 'SimSun'
    }, {
      label: '黑体',
      classes: ['tanbo-editor-font-SimHei'],
      match: {
        styles: {fontFamily: 'SimHei'}
      },
      value: 'SimHei'
    }, {
      label: '微软雅黑',
      classes: ['tanbo-editor-font-Microsoft-YaHei'],
      value: 'Microsoft YaHei',
      match: {
        styles: {fontFamily: 'Microsoft YaHei'}
      }
    }, {
      label: '楷体',
      classes: ['tanbo-editor-font-KaiTi'],
      value: 'KaiTi',
      match: {
        styles: {fontFamily: 'KaiTi'}
      },
    }, {
      label: '仿宋',
      classes: ['tanbo-editor-font-FangSong'],
      match: {
        styles: {fontFamily: 'FangSong'}
      },
      value: 'FangSong',
    }, {
      label: 'Arial',
      classes: ['tanbo-editor-font-Arial'],
      match: {
        styles: {fontFamily: 'Arial'}
      },
      value: 'Arial',
    }, {
      label: 'Times New Roman',
      classes: ['tanbo-editor-font-Times-New-Roman'],
      value: 'Times New Roman',
      match: {
        styles: {fontFamily: 'Times New Roman'}
      },
    }
  ]
};
