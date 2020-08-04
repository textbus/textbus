import { italicFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { Toolkit } from '../toolkit/toolkit';
import { PreComponent } from '../../components/pre.component';

export const italicTool = Toolkit.makeButtonTool({
  classes: ['textbus-icon-italic'],
  tooltip: '斜体',
  keymap: {
    ctrlKey: true,
    key: 'i'
  },
  matcher: new FormatMatcher(italicFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineCommander('em', italicFormatter);
  }
});
