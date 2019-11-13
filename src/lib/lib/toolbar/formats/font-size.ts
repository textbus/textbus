import { HandlerType, propertyHandlerPriority, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const fontSizeHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '字体大小',
  classes: ['tanbo-editor-icon-font-size'],
  execCommand: new StyleCommander('fontSize', ''),
  priority: propertyHandlerPriority,
  mini: true,
  options: [
    {
      label: '12px',
      match: {
        styles: {fontSize: '12px'}
      },
      classes: ['tanbo-editor-font-size-12'],
      value: '12px'
    },
    {
      label: '13px',
      match: {
        styles: {fontSize: '13px'}
      },
      classes: ['tanbo-editor-font-size-13'],
      value: '13px'
    },
    {
      label: '14px',
      match: {
        styles: {fontSize: '14px'}
      },
      classes: ['tanbo-editor-font-size-14'],
      value: '14px',
      default: true
    },
    {
      label: '16px',
      match: {
        styles: {fontSize: '16px'}
      },
      classes: ['tanbo-editor-font-size-16'],
      value: '16px'
    },
    {
      label: '18px',
      match: {
        styles: {fontSize: '18px'}
      },
      classes: ['tanbo-editor-font-size-18'],
      value: '18px'
    },
    {
      label: '20px',
      match: {
        styles: {fontSize: '20px'}
      },
      classes: ['tanbo-editor-font-size-20'],
      value: '20px'
    },
    {
      label: '24px',
      match: {
        styles: {fontSize: '24px'}
      },
      classes: ['tanbo-editor-font-size-24'],
      value: '24px'
    },
    {
      label: '36px',
      match: {
        styles: {lineHeight: '36px'}
      },
      classes: ['tanbo-editor-font-size-36'],
      value: '36px'
    },
    {
      label: '48px',
      match: {
        styles: {lineHeight: '48px'}
      },
      classes: ['tanbo-editor-font-size-48'],
      value: '48px'
    }
  ]
};
