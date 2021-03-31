import { underlineFormatter } from '../../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';

export const underlineToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-underline'],
  tooltip: i18n => i18n.get('plugins.toolbar.underlineTool.tooltip'),
  keymap: {
    ctrlKey: true,
    key: 'u'
  },
  matcher: new FormatMatcher(underlineFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineCommander('u', underlineFormatter);
  }
};
export const underlineTool = new ButtonTool(underlineToolConfig);
