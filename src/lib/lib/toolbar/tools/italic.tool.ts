import { italicFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';
import { Toolkit } from '../toolkit/toolkit';

export const italicTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-italic'],
  tooltip: '斜体',
  keymap: {
    ctrlKey: true,
    key: 'i'
  },
  match: new FormatMatcher(italicFormatter),
  execCommand: new InlineCommander('em', italicFormatter)
});
