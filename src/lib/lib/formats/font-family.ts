import { HandlerType, SelectHandlerOption } from '../toolbar/help';
import { StyleFormatter } from '../toolbar/fomatter/style-formatter';

export const fontFamilyHandler: SelectHandlerOption = {
  type: HandlerType.Select,
  tooltip: '字体',
  options: [
    {
      label: 'sans-serif',
      classes: ['tanbo-editor-toolbar-font-sans-serif'],
      match: {
        styles: {fontFamily: 'sans-serif'}
      },
      execCommand: new StyleFormatter('fontFamily', 'sans-serif', true),
      default: true
    }, {
      label: '宋体',
      classes: ['tanbo-editor-toolbar-font-SimSun'],
      match: {
        styles: {fontFamily: 'SimSun'}
      },
      execCommand: new StyleFormatter('fontFamily', 'SimSun', true),
    }, {
      label: '黑体',
      classes: ['tanbo-editor-toolbar-font-SimHei'],
      match: {
        styles: {fontFamily: 'SimHei'}
      },
      execCommand: new StyleFormatter('fontFamily', 'SimHei', true),
    }, {
      label: '微软雅黑',
      classes: ['tanbo-editor-toolbar-font-Microsoft-YaHei'],
      match: {
        styles: {fontFamily: 'Microsoft YaHei'}
      },
      execCommand: new StyleFormatter('fontFamily', 'Microsoft YaHei', true),
    }, {
      label: '楷体',
      classes: ['tanbo-editor-toolbar-font-KaiTi'],
      match: {
        styles: {fontFamily: 'KaiTi'}
      },
      execCommand: new StyleFormatter('fontFamily', 'KaiTi', true),
    }, {
      label: '仿宋',
      classes: ['tanbo-editor-toolbar-font-FangSong'],
      match: {
        styles: {fontFamily: 'FangSong'}
      },
      execCommand: new StyleFormatter('fontFamily', 'FangSong', true),
    }, {
      label: 'Arial',
      classes: ['tanbo-editor-toolbar-font-Arial'],
      match: {
        styles: {fontFamily: 'Arial'}
      },
      execCommand: new StyleFormatter('fontFamily', 'Arial', true),
    }, {
      label: 'Times New Roman',
      classes: ['tanbo-editor-toolbar-font-Times-New-Roman'],
      match: {
        styles: {fontFamily: 'Times New Roman'}
      },
      execCommand: new StyleFormatter('fontFamily', 'Times New Roman', true),
    }
  ]
};
