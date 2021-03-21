import { codeFormatter } from '../../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';

export const codeToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-code'],
  tooltip: '代码',
  // keymap: {
  //   ctrlKey: true,
  //   key: ''
  // },
  matcher: new FormatMatcher(codeFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineCommander('code', codeFormatter);
  }
};
export const codeTool = Toolkit.makeButtonTool(codeToolConfig);
