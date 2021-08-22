import { FormatData } from '@textbus/core';
import { lineHeightFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { FormatMatcher } from '../matcher/format.matcher';
import { StyleCommander } from '../commands/style.commander';
import { SelectTool, SelectToolConfig } from '../toolkit/_api';

export const lineHeightToolConfig: SelectToolConfig = {
  tooltip: i18n => i18n.get('plugins.toolbar.lineHeightTool.tooltip'),
  iconClasses: ['textbus-icon-line-height'],
  mini: true,
  options: [{
    label: i18n => i18n.get('plugins.toolbar.lineHeightTool.defaultValueLabel'),
    classes: ['textbus-toolbar-line-height-inherit'],
    value: '',
    default: true
  }, {
    label: '1x',
    classes: ['textbus-toolbar-line-height-1'],
    value: '1em'
  }, {
    label: '1.2x',
    classes: ['textbus-toolbar-line-height-1_2'],
    value: '1.2em'
  }, {
    label: '1.4x',
    classes: ['textbus-toolbar-line-height-1_4'],
    value: '1.4em'
  }, {
    label: '1.6x',
    classes: ['textbus-toolbar-line-height-1_6'],
    value: '1.6em'
  }, {
    label: '1.8x',
    classes: ['textbus-toolbar-line-height-1_8'],
    value: '1.8em'
  }, {
    label: '2x',
    classes: ['textbus-toolbar-line-height-2'],
    value: '2em'
  }, {
    label: '3x',
    classes: ['textbus-toolbar-line-height-3'],
    value: '3em'
  }, {
    label: '4x',
    classes: ['textbus-toolbar-line-height-4'],
    value: '4em'
  }],
  matcher: new FormatMatcher(lineHeightFormatter, [PreComponent]),
  matchOption(data) {
    if (data instanceof FormatData) {
      for (const option of lineHeightToolConfig.options) {
        if (option.value === data.styles.get('lineHeight')) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new StyleCommander('lineHeight', lineHeightFormatter);
  }
};
export const lineHeightTool = new SelectTool(lineHeightToolConfig);
