import { PreComponent } from '@textbus/components';
import { subscriptFormatter } from '@textbus/formatters';

import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';

export const subscriptToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-subscript'],
  tooltip: i18n => i18n.get('plugins.tooltip.subscript.tooltip'),
  matcher: new FormatMatcher(subscriptFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineCommander('sub', subscriptFormatter);
  }
}
export const subscriptTool = new ButtonTool(subscriptToolConfig);
