import { superscriptFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { Toolkit } from '../toolkit/toolkit';
import { PreTemplate } from '../../templates/pre.template';

export const superscriptTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-superscript'],
  tooltip: '上标',
  matcher: new FormatMatcher(superscriptFormatter, [PreTemplate]),
  commanderFactory() {
    return new InlineCommander('sup', superscriptFormatter);
  }
});
