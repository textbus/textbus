import { underlineFormatter } from '../../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';

export const underlineToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-underline'],
  tooltip: '下划线',
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
