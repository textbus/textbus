import { HandlerType, SelectHandlerOption } from '../toolbar/help';
import { StyleFormatter } from '../edit-frame/fomatter/style-formatter';

export const fontSizeHandler: SelectHandlerOption = {
  type: HandlerType.Select,
  tooltip: '字体大小',
  classes: ['tanbo-editor-icon-font-size'],
  mini: true,
  options: [
    {
      label: '12px',
      match: {
        styles: {lineHeight: '12px'}
      },
      execCommand: new StyleFormatter('fontSize', '12px'),
    },
    {
      label: '14px',
      match: {
        styles: {lineHeight: '14px'}
      },
      execCommand: new StyleFormatter('fontSize', '14px'),
      default: true
    },
    {
      label: '16px',
      match: {
        styles: {lineHeight: '16px'}
      },
      execCommand: new StyleFormatter('fontSize', '16px')
    },
    {
      label: '18px',
      match: {
        styles: {lineHeight: '18px'}
      },
      execCommand: new StyleFormatter('fontSize', '18px')
    },
    {
      label: '20px',
      match: {
        styles: {lineHeight: '20px'}
      },
      execCommand: new StyleFormatter('fontSize', '20px')
    },
    {
      label: '24px',
      match: {
        styles: {lineHeight: '24px'}
      },
      execCommand: new StyleFormatter('fontSize', '24px')
    },
    {
      label: '36px',
      match: {
        styles: {lineHeight: '36px'}
      },
      execCommand: new StyleFormatter('fontSize', '36px')
    },
    {
      label: '72px',
      match: {
        styles: {lineHeight: '72px'}
      },
      execCommand: new StyleFormatter('fontSize', '72px')
    },
  ]
};
