import { HandlerType, Priority, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const fontSizeHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '字体大小',
  classes: ['tbus-icon-font-size'],
  execCommand: new StyleCommander('fontSize'),
  priority: Priority.Property,
  highlight(options, abstractData) {
    for (const option of options) {
      if (option.value === abstractData.style.value) {
        return option;
      }
    }
  },
  editable: {
    styleName: 'fontSize'
  },
  match: {
    styles: {
      fontSize: ['12px', '13px', '14px','15px', '16px', '18px', '20px', '24px', '36px', '48px']
    },
    noInTags: ['pre']
  },
  mini: true,
  options: [
    {
      label: '12px',
      classes: ['tbus-font-size-12'],
      value: '12px'
    },
    {
      label: '13px',
      classes: ['tbus-font-size-13'],
      value: '13px'
    },
    {
      label: '14px',
      classes: ['tbus-font-size-14'],
      value: '14px',
      default: true
    },
    {
      label: '15px',
      classes: ['tbus-font-size-15'],
      value: '15px',
    },
    {
      label: '16px',
      classes: ['tbus-font-size-16'],
      value: '16px'
    },
    {
      label: '18px',
      classes: ['tbus-font-size-18'],
      value: '18px'
    },
    {
      label: '20px',
      classes: ['tbus-font-size-20'],
      value: '20px'
    },
    {
      label: '24px',
      classes: ['tbus-font-size-24'],
      value: '24px'
    },
    {
      label: '36px',
      classes: ['tbus-font-size-36'],
      value: '36px'
    },
    {
      label: '48px',
      classes: ['tbus-font-size-48'],
      value: '48px'
    }
  ]
};
