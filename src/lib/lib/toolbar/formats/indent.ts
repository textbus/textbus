import { HandlerType, Priority, SelectConfig } from '../help';
import { BlockStyleCommander } from '../../commands/block-style-commander';

const commander = new BlockStyleCommander('textIndent');

export const indentHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '首行缩进',
  priority: Priority.BlockStyle,
  classes: ['tanbo-editor-icon-text-indent'],
  execCommand: commander,
  mini: true,
  highlight(options, abstractData) {
    for (const option of options) {
      if (option.value === abstractData.style.value) {
        return option;
      }
    }
  },
  editable: {
    styleName: 'textIndent'
  },
  match: {
    styles: {
      textIndent: /.+/
    },
    noInTags: ['pre']
  },
  options: [
    {
      label: '0x',
      value: '0',
      classes: ['tanbo-editor-text-indent-0'],
      default: true
    }, {
      label: '1x',
      value: '1em',
      classes: ['tanbo-editor-text-indent-1'],
      default: true
    }, {
      label: '2x',
      classes: ['tanbo-editor-text-indent-2'],
      value: '2em',
    }, {
      label: '4x',
      classes: ['tanbo-editor-text-indent-4'],
      value: '4em'
    }
  ]
};
