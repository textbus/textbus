import { subscriptFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { Toolkit } from '../toolkit/toolkit';

export const subscriptTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-subscript'],
  tooltip: '下标',
  match: new FormatMatcher(subscriptFormatter),
  execCommand: new InlineCommander('sub', subscriptFormatter)
});
