import { HandlerType, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const letterSpacingHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '字间距',
  classes: ['tanbo-editor-icon-text-width'],
  mini: true,
  options: [
    {
      label: '0px',
      match: {
        styles: {letterSpacing: ['', '0px']}
      },
      execCommand: new StyleCommander('letterSpacing', '0px'),
      default: true
    },
    {
      label: '1px',
      match: {
        styles: {letterSpacing: '1px'}
      },
      execCommand: new StyleCommander('letterSpacing', '1px'),
    },
    {
      label: '2px',
      match: {
        styles: {letterSpacing: '2px'}
      },
      execCommand: new StyleCommander('letterSpacing', '2px'),
    },
    {
      label: '3px',
      match: {
        styles: {letterSpacing: '3px'}
      },
      execCommand: new StyleCommander('letterSpacing', '3px'),
    },
    {
      label: '4px',
      match: {
        styles: {letterSpacing: '4px'}
      },
      execCommand: new StyleCommander('letterSpacing', '4px'),
    },
    {
      label: '5px',
      match: {
        styles: {letterSpacing: '5px'}
      },
      execCommand: new StyleCommander('letterSpacing', '5px'),
    }
  ]
};
