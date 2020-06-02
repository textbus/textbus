import { superscriptFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { Toolkit } from '../toolkit/toolkit';

export const superscriptTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-superscript'],
  tooltip: '上标',
  match: new FormatMatcher(superscriptFormatter),
  execCommand() {
    return new InlineCommander('sup', superscriptFormatter);
  }
});
