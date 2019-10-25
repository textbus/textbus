import { HandlerType, SelectHandlerOption } from '../toolbar/help';
import { StyleFormatter } from '../edit-frame/fomatter/style-formatter';

export const textWidthHandler: SelectHandlerOption = {
  type: HandlerType.Select,
  tooltip: '字间距',
  classes: ['tanbo-editor-icon-text-width'],
  options: [
    {
      label: '1px',
      match: {
        styles: {lineHeight: '1px'}
      },
      execCommand: new StyleFormatter('t', '1px'),
      default: true
    },
    {
      label: '1.2',
      match: {
        styles: {lineHeight: '1.2em'}
      },
      execCommand: new StyleFormatter('lineHeight', '1.2em'),
    },
    {
      label: '1.4',
      match: {
        styles: {lineHeight: '1.4em'}
      },
      execCommand: new StyleFormatter('lineHeight', '1.4em'),
    },
    {
      label: '1.6',
      match: {
        styles: {lineHeight: '1.6em'}
      },
      execCommand: new StyleFormatter('lineHeight', '1.6em'),
    },
    {
      label: '1.8',
      match: {
        styles: {lineHeight: '1.8em'}
      },
      execCommand: new StyleFormatter('lineHeight', '1.8em'),
    },
    {
      label: '2',
      match: {
        styles: {lineHeight: '2em'}
      },
      execCommand: new StyleFormatter('lineHeight', '2em'),
    },
    {
      label: '3',
      match: {
        styles: {lineHeight: '3em'}
      },
      execCommand: new StyleFormatter('lineHeight', '3em'),
    },
    {
      label: '4',
      match: {
        styles: {lineHeight: '4em'}
      },
      execCommand: new StyleFormatter('lineHeight', '4em'),
    }
  ]
};
