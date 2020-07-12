import { strikeThroughFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { Toolkit } from '../toolkit/toolkit';
import { PreComponent } from '../../components/pre.component';

export const strikeThroughTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-strikethrough'],
  tooltip: '删除线',
  keymap: {
    ctrlKey: true,
    key: 'd'
  },
  matcher: new FormatMatcher(strikeThroughFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineCommander('del', strikeThroughFormatter);
  }
});
