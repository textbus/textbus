import { FormatData } from '@textbus/core';
import { textIndentFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { FormatMatcher } from '../matcher/format.matcher';
import { BlockStyleCommander } from '../commands/block-style.commander';
import { SelectTool, SelectToolConfig } from '../toolkit/_api';

export const textIndentToolConfig: SelectToolConfig = {
  tooltip: i18n => i18n.get('plugins.toolbar.textIndentTool.tooltip'),
  iconClasses: ['textbus-icon-text-indent'],
  mini: true,
  options: [{
    label: '0x',
    value: '0',
    classes: ['textbus-toolbar-text-indent-0'],
    default: true
  }, {
    label: '1x',
    value: '1em',
    classes: ['textbus-toolbar-text-indent-1'],
    default: true
  }, {
    label: '2x',
    classes: ['textbus-toolbar-text-indent-2'],
    value: '2em',
  }, {
    label: '4x',
    classes: ['textbus-toolbar-text-indent-4'],
    value: '4em'
  }],
  matcher: new FormatMatcher(textIndentFormatter, [PreComponent]),
  matchOption(data) {
    if (data instanceof FormatData) {
      for (const option of textIndentToolConfig.options) {
        if (option.value === data.styles.get('textIndent')) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new BlockStyleCommander('textIndent', textIndentFormatter);
  }
};
export const textIndentTool = new SelectTool(textIndentToolConfig);
