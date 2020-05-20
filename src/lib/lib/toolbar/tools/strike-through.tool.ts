import { ButtonConfig, HandlerType } from '../help';
import { strikeThroughFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../../matcher/format.matcher';
import { InlineCommander } from '../../commands/inline.commander';

export const strikeThroughTool: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-strikethrough'],
  tooltip: '删除线',
  keymap: {
    ctrlKey: true,
    key: 'd'
  },
  match: new FormatMatcher(strikeThroughFormatter),
  execCommand: new InlineCommander('del', strikeThroughFormatter)
};
