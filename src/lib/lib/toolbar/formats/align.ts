import { HandlerType, SelectConfig, propertyHandlerPriority } from '../help';
import { BlockStyleCommander } from '../../commands/block-style-commander';

const commander = new BlockStyleCommander('textAlign', '');

export const alignHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '对齐方式',
  priority: propertyHandlerPriority,
  execCommand: commander,
  options: [
    {
      label: '左对齐',
      classes: ['tanbo-editor-icon-paragraph-left'],
      match: {
        styles: {
          textAlign: ['', 'left']
        }
      },
      value: 'left',
      default: true
    }, {
      label: '右对齐',
      classes: ['tanbo-editor-icon-paragraph-right'],
      match: {
        styles: {
          textAlign: 'right'
        }
      },
      value: 'right',
    }, {
      label: '居中对齐',
      classes: ['tanbo-editor-icon-paragraph-center'],
      match: {
        styles: {
          textAlign: 'center'
        }
      },
      value: 'center'
    }, {
      label: '分散对齐',
      classes: ['tanbo-editor-icon-paragraph-justify'],
      match: {
        styles: {
          textAlign: 'justify'
        }
      },
      value: 'justify',
    }
  ]
};
