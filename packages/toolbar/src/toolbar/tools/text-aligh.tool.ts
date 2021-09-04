import { FormatData } from '@textbus/core';
import { textAlignFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { FormatMatcher } from '../matcher/format.matcher';
import { BlockStyleCommander } from '../commands/block-style.commander';
import { SelectTool, SelectToolConfig } from '../toolkit/_api';

export const textAlignToolConfig: SelectToolConfig = {
  tooltip: i18n => i18n.get('plugins.toolbar.textAlignTool.tooltip'),
  options: [{
    label: i18n => i18n.get('plugins.toolbar.textAlignTool.left'),
    iconClasses: ['textbus-icon-paragraph-left'],
    value: 'left',
    keymap: {
      ctrlKey: true,
      key: 'l'
    },
    default: true
  }, {
    label: i18n => i18n.get('plugins.toolbar.textAlignTool.right'),
    iconClasses: ['textbus-icon-paragraph-right'],
    value: 'right',
    keymap: {
      ctrlKey: true,
      key: 'r'
    },
  }, {
    label: i18n => i18n.get('plugins.toolbar.textAlignTool.center'),
    iconClasses: ['textbus-icon-paragraph-center'],
    value: 'center',
    keymap: {
      ctrlKey: true,
      key: 'e'
    },
  }, {
    label: i18n => i18n.get('plugins.toolbar.textAlignTool.justify'),
    iconClasses: ['textbus-icon-paragraph-justify'],
    value: 'justify',
    keymap: {
      ctrlKey: true,
      key: 'j'
    },
  }],
  matcher: new FormatMatcher(textAlignFormatter, [PreComponent]),
  matchOption(data) {
    if (data instanceof FormatData) {
      for (const option of textAlignToolConfig.options) {
        if (option.value === data.styles.get('textAlign')) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new BlockStyleCommander('textAlign', textAlignFormatter);
  }
};
export const textAlignTool = new SelectTool(textAlignToolConfig);
