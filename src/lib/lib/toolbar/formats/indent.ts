import { HandlerType, Priority, SelectConfig } from '../help';
import { BlockStyleCommander } from '../../commands/block-style-commander';

const commander = new BlockStyleCommander('textIndent', '');

export const indentHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '首行缩进',
  priority: Priority.BlockStyle,
  classes: ['tanbo-editor-icon-text-indent'],
  execCommand: commander,
  mini: true,
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
      textAlign: /.*/
    }
  },
  options: [
    {
      label: '0x',
      value: '0',
      default: true
    }, {
      label: '1x',
      value: '1em',
      default: true
    }, {
      label: '2x',
      value: '2em',
    }, {
      label: '4x',
      value: '4em'
    }
  ]
};
