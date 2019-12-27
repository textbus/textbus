import { HandlerType, Priority, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const letterSpacingHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '字间距',
  priority: Priority.Property,
  execCommand: new StyleCommander('letterSpacing'),
  classes: ['tanbo-editor-icon-text-width'],
  highlight(options, cacheData) {
    for (const option of options) {
      if (option.value === cacheData.style.value) {
        return option;
      }
    }
  },
  editable: {
    styleName: 'letterSpacing'
  },
  match: {
    styles: {
      letterSpacing: ['0px', '1px', '2px', '3px', '4px', '5px']
    },
    noInTags: ['pre']
  },
  mini: true,
  options: [
    {
      label: '0px',
      value: '0px',
      classes: ['tanbo-editor-letter-spacing-0'],
      default: true
    },
    {
      label: '1px',
      classes: ['tanbo-editor-letter-spacing-1'],
      value: '1px',
    },
    {
      label: '2px',
      classes: ['tanbo-editor-letter-spacing-2'],
      value: '2px',
    },
    {
      label: '3px',
      classes: ['tanbo-editor-letter-spacing-3'],
      value: '3px',
    },
    {
      label: '4px',
      classes: ['tanbo-editor-letter-spacing-4'],
      value: '4px',
    },
    {
      label: '5px',
      classes: ['tanbo-editor-letter-spacing-5'],
      value: '5px',
    }
  ]
};
