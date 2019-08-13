import { SelectHandler, SelectHandlerOption } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const fontFamilyHandler: SelectHandler = {
  type: 'select',
  tooltip: '字体',
  options: [{
    label: 'sans-serif',
    classes: ['tanbo-editor-toolbar-font-sans-serif'],
    default: true
  }, {
    label: '宋体',
    classes: ['tanbo-editor-toolbar-font-SimSun']
  }, {
    label: '黑体',
    classes: ['tanbo-editor-toolbar-font-SimHei']
  }, {
    label: '微软雅黑',
    classes: ['tanbo-editor-toolbar-font-Microsoft-YaHei']
  }, {
    label: '楷体',
    classes: ['tanbo-editor-toolbar-font-KaiTi']
  }, {
    label: '仿宋',
    classes: ['tanbo-editor-toolbar-font-FangSong']
  }, {
    label: 'Arial',
    classes: ['tanbo-editor-toolbar-font-Arial']
  }, {
    label: 'Times New Roman',
    classes: ['tanbo-editor-toolbar-font-Times-New-Roman']
  }],
  execCommand(option: SelectHandlerOption, editor: Editor): void {
    editor.contentDocument.execCommand('fontName', false, option.label);
  }
};
