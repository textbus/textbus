import { strikeThroughFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';

export const strikeThroughToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-strikethrough'],
  tooltip: i18n => i18n.get('plugins.toolbar.strikeThrough.tooltip'),
  keymap: {
    ctrlKey: true,
    key: 'd'
  },
  matcher: new FormatMatcher(strikeThroughFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineCommander('del', strikeThroughFormatter);
  }
};
export const strikeThroughTool = new ButtonTool(strikeThroughToolConfig);
