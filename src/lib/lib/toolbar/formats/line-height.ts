import { HandlerType, propertyHandlerPriority, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const lineHeightHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '行高',
  classes: ['tanbo-editor-icon-line-height'],
  execCommand: new StyleCommander('lineHeight'),
  mini: true,
  highlight(options, cacheData) {
    for (const option of options) {
      if (option.value === cacheData.style.value) {
        return option;
      }
    }
  },
  cacheData: {
    styleName: 'lineHeight'
  },
  match: {
    styles: {
      lineHeight: ['1em', '1.2em', '1.4em', '1.6em', '1.8em', '2em', '3em', '4em']
    }
  },
  priority: propertyHandlerPriority,
  options: [
    {
      label: '1x',
      value: '1em',
      default: true
    },
    {
      label: '1.2x',
      value: '1.2em'
    },
    {
      label: '1.4x',
      value: '1.4em'
    },
    {
      label: '1.6x',
      value: '1.6em'
    },
    {
      label: '1.8x',
      value: '1.8em'
    },
    {
      label: '2x',
      value: '2em'
    },
    {
      label: '3x',
      value: '3em'
    },
    {
      label: '4x',
      value: '4em'
    }
  ]
};
