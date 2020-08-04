import { codeFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { Toolkit } from '../toolkit/toolkit';
import { PreComponent } from '../../components/pre.component';

export const codeTool = Toolkit.makeButtonTool({
  classes: ['textbus-icon-code'],
  tooltip: '代码',
  // keymap: {
  //   ctrlKey: true,
  //   key: ''
  // },
  matcher: new FormatMatcher(codeFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineCommander('code', codeFormatter);
  }
});
