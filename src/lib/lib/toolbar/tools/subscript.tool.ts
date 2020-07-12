import { subscriptFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { Toolkit } from '../toolkit/toolkit';
import { PreComponent } from '../../components/pre.component';

export const subscriptTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-subscript'],
  tooltip: '下标',
  matcher: new FormatMatcher(subscriptFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineCommander('sub', subscriptFormatter);
  }
});
