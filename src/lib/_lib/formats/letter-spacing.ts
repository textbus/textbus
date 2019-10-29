import { HandlerType, SelectHandlerOption } from '../toolbar/help';
import { StyleFormatter } from '../edit-frame/fomatter/style-formatter';

export const letterSpacingHandler: SelectHandlerOption = {
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
      execCommand: new StyleFormatter('letterSpacing', '0px'),
      default: true
    },
    {
      label: '1px',
      match: {
        styles: {letterSpacing: '1px'}
      },
      execCommand: new StyleFormatter('letterSpacing', '1px'),
    },
    {
      label: '2px',
      match: {
        styles: {letterSpacing: '2px'}
      },
      execCommand: new StyleFormatter('letterSpacing', '2px'),
    },
    {
      label: '3px',
      match: {
        styles: {letterSpacing: '3px'}
      },
      execCommand: new StyleFormatter('letterSpacing', '3px'),
    },
    {
      label: '4px',
      match: {
        styles: {letterSpacing: '4px'}
      },
      execCommand: new StyleFormatter('letterSpacing', '4px'),
    },
    {
      label: '5px',
      match: {
        styles: {letterSpacing: '5px'}
      },
      execCommand: new StyleFormatter('letterSpacing', '5px'),
    }
  ]
};
