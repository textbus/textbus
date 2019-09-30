import { HandlerType, SelectHandlerOption } from '../toolbar/help';
import { StyleFormatter } from '../edit-frame/fomatter/style-formatter';

export const fontFamilyHandler: SelectHandlerOption = {
  type: HandlerType.Select,
  tooltip: '字体',
  options: [
    {
      label: 'sans-serif',
      classes: ['tanbo-editor-font-sans-serif'],
      match: {
        styles: {fontFamily: ['', 'sans-serif']}
      },
      execCommand: new StyleFormatter('fontFamily', 'sans-serif'),
      default: true
    }, {
      label: '宋体',
      classes: ['tanbo-editor-font-SimSun'],
      match: {
        styles: {fontFamily: 'SimSun'}
      },
      execCommand: new StyleFormatter('fontFamily', 'SimSun'),
    }, {
      label: '黑体',
      classes: ['tanbo-editor-font-SimHei'],
      match: {
        styles: {fontFamily: 'SimHei'}
      },
      execCommand: new StyleFormatter('fontFamily', 'SimHei'),
    }, {
      label: '微软雅黑',
      classes: ['tanbo-editor-font-Microsoft-YaHei'],
      match: {
        styles: {fontFamily: 'Microsoft YaHei'}
      },
      execCommand: new StyleFormatter('fontFamily', 'Microsoft YaHei'),
    }, {
      label: '楷体',
      classes: ['tanbo-editor-font-KaiTi'],
      match: {
        styles: {fontFamily: 'KaiTi'}
      },
      execCommand: new StyleFormatter('fontFamily', 'KaiTi'),
    }, {
      label: '仿宋',
      classes: ['tanbo-editor-font-FangSong'],
      match: {
        styles: {fontFamily: 'FangSong'}
      },
      execCommand: new StyleFormatter('fontFamily', 'FangSong'),
    }, {
      label: 'Arial',
      classes: ['tanbo-editor-font-Arial'],
      match: {
        styles: {fontFamily: 'Arial'}
      },
      execCommand: new StyleFormatter('fontFamily', 'Arial'),
    }, {
      label: 'Times New Roman',
      classes: ['tanbo-editor-font-Times-New-Roman'],
      match: {
        styles: {fontFamily: 'Times New Roman'}
      },
      execCommand: new StyleFormatter('fontFamily', 'Times New Roman'),
    }
  ]
};
