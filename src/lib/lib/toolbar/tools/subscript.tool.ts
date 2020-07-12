import { subscriptFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { Toolkit } from '../toolkit/toolkit';
import { PreTemplate } from '../../templates/pre.template';

export const subscriptTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-subscript'],
  tooltip: '下标',
  matcher: new FormatMatcher(subscriptFormatter, [PreTemplate]),
  commanderFactory() {
    return new InlineCommander('sub', subscriptFormatter);
  }
});
