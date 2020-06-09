import { FormatMatcher } from '../matcher/format.matcher';
import { fontSizeFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatAbstractData } from '../../core/format-abstract-data';
import { Toolkit } from '../toolkit/toolkit';

export const fontSizeTool = Toolkit.makeSelectTool({
  tooltip: '字体大小',
  classes: ['tbus-icon-font-size'],
  mini: true,
  options: [{
    label: '12px',
    classes: ['tbus-font-size-12'],
    value: '12px'
  }, {
    label: '13px',
    classes: ['tbus-font-size-13'],
    value: '13px'
  }, {
    label: '14px',
    classes: ['tbus-font-size-14'],
    value: '14px'
  }, {
    label: '15px',
    classes: ['tbus-font-size-15'],
    value: '15px',
  }, {
    label: '16px',
    classes: ['tbus-font-size-16'],
    value: '16px',
    default: true
  }, {
    label: '18px',
    classes: ['tbus-font-size-18'],
    value: '18px'
  }, {
    label: '20px',
    classes: ['tbus-font-size-20'],
    value: '20px'
  }, {
    label: '24px',
    classes: ['tbus-font-size-24'],
    value: '24px'
  }, {
    label: '36px',
    classes: ['tbus-font-size-36'],
    value: '36px'
  }, {
    label: '48px',
    classes: ['tbus-font-size-48'],
    value: '48px'
  }],
  match: new FormatMatcher(fontSizeFormatter),
  highlight(options, data) {
    if (data instanceof FormatAbstractData) {
      for (const option of options) {
        if (option.value === data.style.value) {
          return option;
        }
      }
    }
  },
  execCommand() {
    return new StyleCommander('fontSize', fontSizeFormatter);
  }
});
