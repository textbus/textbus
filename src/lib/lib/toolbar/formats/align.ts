import { HandlerType, SelectConfig, propertyHandlerPriority } from '../help';
import { BlockStyleCommander } from '../../commands/block-style-commander';

export const alignHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '对齐方式',
  options: [
    {
      label: '左对齐',
      classes: ['tanbo-editor-icon-paragraph-left'],
      priority: propertyHandlerPriority,
      match: {
        styles: {
          textAlign: ['', 'left']
        }
      },
      execCommand: new BlockStyleCommander('textAlign', 'left'),
      default: true
    }, {
      label: '右对齐',
      classes: ['tanbo-editor-icon-paragraph-right'],
      priority: propertyHandlerPriority,
      match: {
        styles: {
          textAlign: 'right'
        }
      },
      execCommand: new BlockStyleCommander('textAlign', 'right'),
    }, {
      label: '居中对齐',
      classes: ['tanbo-editor-icon-paragraph-center'],
      priority: propertyHandlerPriority,
      match: {
        styles: {
          textAlign: 'center'
        }
      },
      execCommand: new BlockStyleCommander('textAlign', 'center'),
    }, {
      label: '分散对齐',
      classes: ['tanbo-editor-icon-paragraph-justify'],
      priority: propertyHandlerPriority,
      match: {
        styles: {
          textAlign: 'justify'
        }
      },
      execCommand: new BlockStyleCommander('textAlign', 'justify'),
    }
  ]
};
