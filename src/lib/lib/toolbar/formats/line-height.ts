import { HandlerType, Priority, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const lineHeightHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '行高',
  classes: ['tanbo-editor-icon-line-height'],
  execCommand: new StyleCommander('lineHeight'),
  mini: true,
  priority: Priority.Property,
  highlight(options, cacheData) {
    for (const option of options) {
      if (option.value === cacheData.style.value) {
        return option;
      }
    }
  },
  editable: {
    styleName: 'lineHeight'
  },
  match: {
    styles: {
      lineHeight: ['1em', '1.2em', '1.4em', '1.6em', '1.8em', '2em', '3em', '4em']
    },
    noInTags: ['pre']
  },
  options: [
    {
      label: '1x',
      classes: ['tanbo-editor-line-height-1'],
      value: '1em',
      default: true
    },
    {
      label: '1.2x',
      classes: ['tanbo-editor-line-height-1_2'],
      value: '1.2em'
    },
    {
      label: '1.4x',
      classes: ['tanbo-editor-line-height-1_4'],
      value: '1.4em'
    },
    {
      label: '1.6x',
      classes: ['tanbo-editor-line-height-1_6'],
      value: '1.6em'
    },
    {
      label: '1.8x',
      classes: ['tanbo-editor-line-height-1_8'],
      value: '1.8em'
    },
    {
      label: '2x',
      classes: ['tanbo-editor-line-height-2'],
      value: '2em'
    },
    {
      label: '3x',
      classes: ['tanbo-editor-line-height-3'],
      value: '3em'
    },
    {
      label: '4x',
      classes: ['tanbo-editor-line-height-4'],
      value: '4em'
    }
  ]
};
