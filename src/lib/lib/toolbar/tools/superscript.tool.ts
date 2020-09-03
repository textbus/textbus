import { superscriptFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
import { PreComponent } from '../../components/pre.component';

export const superscriptToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-superscript'],
  tooltip: '上标',
  matcher: new FormatMatcher(superscriptFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineCommander('sup', superscriptFormatter);
  }
};
export const superscriptTool = Toolkit.makeButtonTool(superscriptToolConfig);
