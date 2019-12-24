import { HandlerType, Priority, SelectConfig } from '../help';
import { BlockStyleCommander } from '../../commands/block-style-commander';

const commander = new BlockStyleCommander('textAlign');

export const alignHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '对齐方式',
  priority: Priority.BlockStyle,
  execCommand: commander,
  highlight(options, cacheData) {
    for (const option of options) {
      if (option.value === cacheData.style.value) {
        return option;
      }
    }
  },
  editable: {
    styleName: 'textAlign'
  },
  match: {
    styles: {
      textAlign: ['left', 'right', 'center', 'justify']
    },
    noInTags: ['pre']
  },
  options: [
    {
      label: '左对齐',
      classes: ['tanbo-editor-icon-paragraph-left'],
      value: 'left',
      default: true
    }, {
      label: '右对齐',
      classes: ['tanbo-editor-icon-paragraph-right'],
      value: 'right',
    }, {
      label: '居中对齐',
      classes: ['tanbo-editor-icon-paragraph-center'],
      value: 'center'
    }, {
      label: '分散对齐',
      classes: ['tanbo-editor-icon-paragraph-justify'],
      value: 'justify',
    }
  ]
};
