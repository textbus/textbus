import { SelectHandler, SelectHandlerOption } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const alignHandler: SelectHandler = {
  type: 'select',
  tooltip: '对齐方式',
  options: [{
    label: ' 左对齐',
    classes: ['tanbo-editor-icon-paragraph-left'],
    default: true
  }, {
    label: ' 右对齐',
    classes: ['tanbo-editor-icon-paragraph-right']
  }, {
    label: ' 居中对齐',
    classes: ['tanbo-editor-icon-paragraph-center']
  }, {
    label: ' 分散对齐',
    classes: ['tanbo-editor-icon-paragraph-justify']
  }],
  execCommand(option: SelectHandlerOption, editor: Editor): void {
    // editor.contentDocument.execCommand('styleWidthCSS', false, option.classes);
  }
};
