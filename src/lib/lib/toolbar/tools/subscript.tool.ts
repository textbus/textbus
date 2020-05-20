import { ButtonConfig, HandlerType } from '../help';
import { subscriptFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';

export const subscriptTool: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-subscript'],
  tooltip: '下标',
  match: new FormatMatcher(subscriptFormatter),
  execCommand: new InlineCommander('sub', subscriptFormatter)
};
