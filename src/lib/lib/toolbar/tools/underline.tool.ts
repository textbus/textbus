import { underlineFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { Toolkit } from '../toolkit/toolkit';

export const underlineTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-underline'],
  tooltip: '下划线',
  keymap: {
    ctrlKey: true,
    key: 'u'
  },
  match: new FormatMatcher(underlineFormatter),
  execCommand() {
    return new InlineCommander('u', underlineFormatter);
  }
});
