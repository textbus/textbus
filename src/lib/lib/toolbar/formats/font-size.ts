import { HandlerType, propertyHandlerPriority, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const fontSizeHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '字体大小',
  classes: ['tanbo-editor-icon-font-size'],
  mini: true,
  options: [
    {
      label: '12px',
      priority: propertyHandlerPriority,
      match: {
        styles: {fontSize: '12px'}
      },
      classes: ['tanbo-editor-font-size-12'],
      execCommand: new StyleCommander('fontSize', '12px'),
    },
    {
      label: '13px',
      priority: propertyHandlerPriority,
      match: {
        styles: {fontSize: '13px'}
      },
      classes: ['tanbo-editor-font-size-13'],
      execCommand: new StyleCommander('fontSize', '13px'),
    },
    {
      label: '14px',
      priority: propertyHandlerPriority,
      match: {
        styles: {fontSize: '14px'}
      },
      classes: ['tanbo-editor-font-size-14'],
      execCommand: new StyleCommander('fontSize', '14px'),
      default: true
    },
    {
      label: '16px',
      priority: propertyHandlerPriority,
      match: {
        styles: {fontSize: '16px'}
      },
      classes: ['tanbo-editor-font-size-16'],
      execCommand: new StyleCommander('fontSize', '16px')
    },
    {
      label: '18px',
      priority: propertyHandlerPriority,
      match: {
        styles: {fontSize: '18px'}
      },
      classes: ['tanbo-editor-font-size-18'],
      execCommand: new StyleCommander('fontSize', '18px')
    },
    {
      label: '20px',
      priority: propertyHandlerPriority,
      match: {
        styles: {fontSize: '20px'}
      },
      classes: ['tanbo-editor-font-size-20'],
      execCommand: new StyleCommander('fontSize', '20px')
    },
    {
      label: '24px',
      priority: propertyHandlerPriority,
      match: {
        styles: {fontSize: '24px'}
      },
      classes: ['tanbo-editor-font-size-24'],
      execCommand: new StyleCommander('fontSize', '24px')
    },
    {
      label: '36px',
      priority: propertyHandlerPriority,
      match: {
        styles: {lineHeight: '36px'}
      },
      classes: ['tanbo-editor-font-size-36'],
      execCommand: new StyleCommander('fontSize', '36px')
    },
    {
      label: '48px',
      priority: propertyHandlerPriority,
      match: {
        styles: {lineHeight: '48px'}
      },
      classes: ['tanbo-editor-font-size-48'],
      execCommand: new StyleCommander('fontSize', '48px')
    }
  ]
};
