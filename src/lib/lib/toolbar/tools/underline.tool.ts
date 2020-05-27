import { ButtonConfig, HandlerType } from '../help';
import { underlineFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';

export const underlineTool: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-underline'],
  tooltip: '下划线',
  keymap: {
    ctrlKey: true,
    key: 'u'
  },
  match: new FormatMatcher(underlineFormatter),
  execCommand: new InlineCommander('u', underlineFormatter)
};
