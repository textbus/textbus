import { HandlerType, SelectHandlerOption } from '../toolbar/help';
import { BlockStyleFormatter } from '../editor/fomatter/block-style-formatter';

export const alignHandler: SelectHandlerOption = {
  type: HandlerType.Select,
  tooltip: '对齐方式',
  options: [
    {
      label: ' 左对齐',
      classes: ['tanbo-editor-icon-paragraph-left'],
      match: {
        styles: {
          textAlign: ['', 'left']
        }
      },
      execCommand: new BlockStyleFormatter('textAlign', 'left'),
      default: true
    }, {
      label: ' 右对齐',
      classes: ['tanbo-editor-icon-paragraph-right'],
      match: {
        styles: {
          textAlign: 'right'
        }
      },
      execCommand: new BlockStyleFormatter('textAlign', 'right'),
    }, {
      label: ' 居中对齐',
      classes: ['tanbo-editor-icon-paragraph-center'],
      match: {
        styles: {
          textAlign: 'center'
        }
      },
      execCommand: new BlockStyleFormatter('textAlign', 'center'),
    }, {
      label: ' 分散对齐',
      classes: ['tanbo-editor-icon-paragraph-justify'],
      match: {
        styles: {
          textAlign: 'justify'
        }
      },
      execCommand: new BlockStyleFormatter('textAlign', 'justify'),
    }
  ]
};
