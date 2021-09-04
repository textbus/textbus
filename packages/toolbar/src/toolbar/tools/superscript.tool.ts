import { superscriptFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';

export const superscriptToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-superscript'],
  tooltip: i18n => i18n.get('plugins.toolbar.superscript.tooltip'),
  matcher: new FormatMatcher(superscriptFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineCommander('sup', superscriptFormatter);
  }
};
export const superscriptTool = new ButtonTool(superscriptToolConfig);
