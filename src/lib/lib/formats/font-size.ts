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
        styles: {fontSize: '12px'}
      },
      classes: ['tanbo-editor-font-size-12'],
      execCommand: new StyleFormatter('fontSize', '12px'),
    },
    {
      label: '13px',
      match: {
        styles: {fontSize: '13px'}
      },
      classes: ['tanbo-editor-font-size-13'],
      execCommand: new StyleFormatter('fontSize', '13px'),
    },
    {
      label: '14px',
      match: {
        styles: {fontSize: '14px'}
      },
      classes: ['tanbo-editor-font-size-14'],
      execCommand: new StyleFormatter('fontSize', '14px'),
      default: true
    },
    {
      label: '16px',
      match: {
        styles: {fontSize: '16px'}
      },
      classes: ['tanbo-editor-font-size-16'],
      execCommand: new StyleFormatter('fontSize', '16px')
    },
    {
      label: '18px',
      match: {
        styles: {fontSize: '18px'}
      },
      classes: ['tanbo-editor-font-size-18'],
      execCommand: new StyleFormatter('fontSize', '18px')
    },
    {
      label: '20px',
      match: {
        styles: {fontSize: '20px'}
      },
      classes: ['tanbo-editor-font-size-20'],
      execCommand: new StyleFormatter('fontSize', '20px')
    },
    {
      label: '24px',
      match: {
        styles: {fontSize: '24px'}
      },
      classes: ['tanbo-editor-font-size-24'],
      execCommand: new StyleFormatter('fontSize', '24px')
    },
    {
      label: '36px',
      match: {
        styles: {lineHeight: '36px'}
      },
      classes: ['tanbo-editor-font-size-36'],
      execCommand: new StyleFormatter('fontSize', '36px')
    },
    {
      label: '48px',
      match: {
        styles: {lineHeight: '48px'}
      },
      classes: ['tanbo-editor-font-size-48'],
      execCommand: new StyleFormatter('fontSize', '48px')
    },
    {
      label: '72px',
      match: {
        styles: {fontSize: '72px'}
      },
      classes: ['tanbo-editor-font-size-72'],
      execCommand: new StyleFormatter('fontSize', '72px')
    },
  ]
};
