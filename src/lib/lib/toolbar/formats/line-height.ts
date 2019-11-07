import { HandlerType, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const lineHeightHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '行高',
  classes: ['tanbo-editor-icon-line-height'],
  mini: true,
  options: [
    {
      label: '1x',
      match: {
        styles: {lineHeight: '1em'}
      },
      execCommand: new StyleCommander('lineHeight', '1em'),
      default: true
    },
    {
      label: '1.2x',
      match: {
        styles: {lineHeight: '1_2em'}
      },
      execCommand: new StyleCommander('lineHeight', '1.2em'),
    },
    {
      label: '1.4x',
      match: {
        styles: {lineHeight: '1_4em'}
      },
      execCommand: new StyleCommander('lineHeight', '1.4em'),
    },
    {
      label: '1.6x',
      match: {
        styles: {lineHeight: '1_6em'}
      },
      execCommand: new StyleCommander('lineHeight', '1.6em'),
    },
    {
      label: '1.8x',
      match: {
        styles: {lineHeight: '1_8em'}
      },
      execCommand: new StyleCommander('lineHeight', '1.8em'),
    },
    {
      label: '2x',
      match: {
        styles: {lineHeight: '2em'}
      },
      execCommand: new StyleCommander('lineHeight', '2em'),
    },
    {
      label: '3x',
      match: {
        styles: {lineHeight: '3em'}
      },
      execCommand: new StyleCommander('lineHeight', '3em'),
    },
    {
      label: '4x',
      match: {
        styles: {lineHeight: '4em'}
      },
      execCommand: new StyleCommander('lineHeight', '4em'),
    }
  ]
};
