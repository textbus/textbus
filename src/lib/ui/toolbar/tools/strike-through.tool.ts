import { strikeThroughFormatter } from '../../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';

export const strikeThroughToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-strikethrough'],
  tooltip: '删除线',
  keymap: {
    ctrlKey: true,
    key: 'd'
  },
  matcher: new FormatMatcher(strikeThroughFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineCommander('del', strikeThroughFormatter);
  }
};
export const strikeThroughTool = new ButtonTool(strikeThroughToolConfig);
