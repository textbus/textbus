import { codeFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';

export const codeToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-code'],
  tooltip: i18n => i18n.get('plugins.toolbar.codeTool.tooltip'),
  matcher: new FormatMatcher(codeFormatter, [PreComponent]),
  keymap: {
    key: ';',
    ctrlKey: true,
  },
  commanderFactory() {
    return new InlineCommander('code', codeFormatter);
  }
};
export const codeTool = new ButtonTool(codeToolConfig);
