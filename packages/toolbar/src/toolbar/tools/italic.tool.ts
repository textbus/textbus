import { italicFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';

export const italicToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-italic'],
  tooltip: i18n => i18n.get('plugins.toolbar.italicTool.tooltip'),
  keymap: {
    ctrlKey: true,
    key: 'i'
  },
  matcher: new FormatMatcher(italicFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineCommander('em', italicFormatter);
  }
};
export const italicTool = new ButtonTool(italicToolConfig);
