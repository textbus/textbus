import { HandlerType, propertyHandlerPriority, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const lineHeightHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '行高',
  classes: ['tanbo-editor-icon-line-height'],
  execCommand: new StyleCommander('lineHeight'),
  mini: true,
  priority: propertyHandlerPriority,
  options: [
    {
      label: '1x',
      match: {
        styles: {lineHeight: '1em'}
      },
      value: '1em',
      default: true
    },
    {
      label: '1.2x',
      match: {
        styles: {lineHeight: '1_2em'}
      },
      value: '1.2em'
    },
    {
      label: '1.4x',
      match: {
        styles: {lineHeight: '1_4em'}
      },
      value: '1.4em'
    },
    {
      label: '1.6x',
      match: {
        styles: {lineHeight: '1_6em'}
      },
      value: '1.6em'
    },
    {
      label: '1.8x',
      match: {
        styles: {lineHeight: '1_8em'}
      },
      value: '1.8em'
    },
    {
      label: '2x',
      match: {
        styles: {lineHeight: '2em'}
      },
      value: '2em'
    },
    {
      label: '3x',
      match: {
        styles: {lineHeight: '3em'}
      },
      value: '3em'
    },
    {
      label: '4x',
      match: {
        styles: {lineHeight: '4em'}
      },
      value: '4em'
    }
  ]
};
