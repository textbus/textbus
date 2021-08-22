import { FormatData } from '@textbus/core';
import { letterSpacingFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { FormatMatcher } from '../matcher/format.matcher';
import { StyleCommander } from '../commands/style.commander';
import { SelectTool, SelectToolConfig } from '../toolkit/_api';

export const letterSpacingToolConfig: SelectToolConfig = {
  tooltip: i18n => i18n.get('plugins.toolbar.letterSpacingTool.tooltip'),
  iconClasses: ['textbus-icon-letter-spacing'],
  mini: true,
  options: [{
    label: i18n => i18n.get('plugins.toolbar.letterSpacingTool.defaultValueLabel'),
    value: '',
    classes: ['textbus-toolbar-letter-spacing-inherit'],
    default: true
  }, {
    label: '0px',
    value: '0px',
    classes: ['textbus-toolbar-letter-spacing-0'],
  }, {
    label: '1px',
    classes: ['textbus-toolbar-letter-spacing-1'],
    value: '1px',
  }, {
    label: '2px',
    classes: ['textbus-toolbar-letter-spacing-2'],
    value: '2px',
  }, {
    label: '3px',
    classes: ['textbus-toolbar-letter-spacing-3'],
    value: '3px',
  }, {
    label: '4px',
    classes: ['textbus-toolbar-letter-spacing-4'],
    value: '4px',
  }, {
    label: '5px',
    classes: ['textbus-toolbar-letter-spacing-5'],
    value: '5px',
  }],
  matcher: new FormatMatcher(letterSpacingFormatter, [PreComponent]),
  matchOption(data) {
    if (data instanceof FormatData) {
      for (const option of letterSpacingToolConfig.options) {
        if (option.value === data.styles.get('letterSpacing')) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new StyleCommander('letterSpacing', letterSpacingFormatter);
  }
};
export const letterSpacingTool = new SelectTool(letterSpacingToolConfig);
