import { HandlerType, SelectHandlerOption } from '../toolbar/help';
import { StyleFormatter } from '../toolbar/fomatter/style-formatter';

export const alignHandler: SelectHandlerOption = {
  type: HandlerType.Select,
  tooltip: '对齐方式',
  options: [
    {
      label: ' 左对齐',
      classes: ['tanbo-editor-icon-paragraph-left'],
      match: {
        styles: {
          textAlign: 'left'
        }
      },
      execCommand: new StyleFormatter('textAlign', 'left', false),
      default: true
    }, {
      label: ' 右对齐',
      classes: ['tanbo-editor-icon-paragraph-right'],
      match: {
        styles: {
          textAlign: 'right'
        }
      },
      execCommand: new StyleFormatter('textAlign', 'right', false),
    }, {
      label: ' 居中对齐',
      classes: ['tanbo-editor-icon-paragraph-center'],
      match: {
        styles: {
          textAlign: 'center'
        }
      },
      execCommand: new StyleFormatter('textAlign', 'center', false),
    }, {
      label: ' 分散对齐',
      classes: ['tanbo-editor-icon-paragraph-justify'],
      match: {
        styles: {
          textAlign: 'justify'
        }
      },
      execCommand: new StyleFormatter('textAlign', 'justify', false),
    }
  ]
};
