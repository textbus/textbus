import { FormatData } from '@textbus/core';
import { PreComponent } from '@textbus/components';
import { fontSizeFormatter } from '@textbus/formatters';

import { FormatMatcher } from '../matcher/format.matcher';
import { StyleCommander } from '../commands/style.commander';
import { SelectTool, SelectToolConfig } from '../toolkit/_api';

export const fontSizeToolConfig: SelectToolConfig = {
  tooltip: i18n => i18n.get('plugins.toolbar.fontSizeTool.tooltip'),
  iconClasses: ['textbus-icon-font-size'],
  mini: true,
  options: [{
    label: i18n => i18n.get('plugins.toolbar.fontSizeTool.defaultSizeText'),
    classes: ['textbus-toolbar-font-size-inherit'],
    value: '',
    default: true
  }, {
    label: '12px',
    classes: ['textbus-toolbar-font-size-12'],
    value: '12px'
  }, {
    label: '13px',
    classes: ['textbus-toolbar-font-size-13'],
    value: '13px'
  }, {
    label: '14px',
    classes: ['textbus-toolbar-font-size-14'],
    value: '14px'
  }, {
    label: '15px',
    classes: ['textbus-toolbar-font-size-15'],
    value: '15px',
  }, {
    label: '16px',
    classes: ['textbus-toolbar-font-size-16'],
    value: '16px'
  }, {
    label: '18px',
    classes: ['textbus-toolbar-font-size-18'],
    value: '18px'
  }, {
    label: '20px',
    classes: ['textbus-toolbar-font-size-20'],
    value: '20px'
  }, {
    label: '24px',
    classes: ['textbus-toolbar-font-size-24'],
    value: '24px'
  }, {
    label: '36px',
    classes: ['textbus-toolbar-font-size-36'],
    value: '36px'
  }, {
    label: '48px',
    classes: ['textbus-toolbar-font-size-48'],
    value: '48px'
  }],
  matcher: new FormatMatcher(fontSizeFormatter, [PreComponent]),
  matchOption(data) {
    if (data instanceof FormatData) {
      for (const option of fontSizeToolConfig.options) {
        if (option.value === data.styles.get('fontSize')) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new StyleCommander('fontSize', fontSizeFormatter);
  }
};
export const fontSizeTool = new SelectTool(fontSizeToolConfig);
