import { HandlerType, propertyHandlerPriority, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const fontFamilyHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '字体',
  options: [
    {
      label: 'sans-serif',
      classes: ['tanbo-editor-font-sans-serif'],
      priority: propertyHandlerPriority,
      match: {
        styles: {fontFamily: ['', 'sans-serif']}
      },
      execCommand: new StyleCommander('fontFamily', 'sans-serif'),
      default: true
    }, {
      label: '宋体',
      classes: ['tanbo-editor-font-SimSun'],
      priority: propertyHandlerPriority,
      match: {
        styles: {fontFamily: 'SimSun'}
      },
      execCommand: new StyleCommander('fontFamily', 'SimSun'),
    }, {
      label: '黑体',
      classes: ['tanbo-editor-font-SimHei'],
      priority: propertyHandlerPriority,
      match: {
        styles: {fontFamily: 'SimHei'}
      },
      execCommand: new StyleCommander('fontFamily', 'SimHei'),
    }, {
      label: '微软雅黑',
      classes: ['tanbo-editor-font-Microsoft-YaHei'],
      priority: propertyHandlerPriority,
      match: {
        styles: {fontFamily: 'Microsoft YaHei'}
      },
      execCommand: new StyleCommander('fontFamily', 'Microsoft YaHei'),
    }, {
      label: '楷体',
      classes: ['tanbo-editor-font-KaiTi'],
      priority: propertyHandlerPriority,
      match: {
        styles: {fontFamily: 'KaiTi'}
      },
      execCommand: new StyleCommander('fontFamily', 'KaiTi'),
    }, {
      label: '仿宋',
      classes: ['tanbo-editor-font-FangSong'],
      priority: propertyHandlerPriority,
      match: {
        styles: {fontFamily: 'FangSong'}
      },
      execCommand: new StyleCommander('fontFamily', 'FangSong'),
    }, {
      label: 'Arial',
      classes: ['tanbo-editor-font-Arial'],
      priority: propertyHandlerPriority,
      match: {
        styles: {fontFamily: 'Arial'}
      },
      execCommand: new StyleCommander('fontFamily', 'Arial'),
    }, {
      label: 'Times New Roman',
      classes: ['tanbo-editor-font-Times-New-Roman'],
      priority: propertyHandlerPriority,
      match: {
        styles: {fontFamily: 'Times New Roman'}
      },
      execCommand: new StyleCommander('fontFamily', 'Times New Roman'),
    }
  ]
};
