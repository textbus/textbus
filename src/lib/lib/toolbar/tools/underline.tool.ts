import { underlineFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { Toolkit } from '../toolkit/toolkit';
import { PreTemplate } from '../../templates/pre.template';

export const underlineTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-underline'],
  tooltip: '下划线',
  keymap: {
    ctrlKey: true,
    key: 'u'
  },
  matcher: new FormatMatcher(underlineFormatter, [PreTemplate]),
  commanderFactory() {
    return new InlineCommander('u', underlineFormatter);
  }
});
