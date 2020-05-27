import { ButtonConfig, HandlerType } from '../help';
import { superscriptFormatter } from '../../formatter/inline.formatter';
import { FormatMatcher } from '../matcher/format.matcher';
import { InlineCommander } from '../commands/inline.commander';

export const superscriptTool: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-superscript'],
  tooltip: '上标',
  match: new FormatMatcher(superscriptFormatter),
  execCommand: new InlineCommander('sup', superscriptFormatter)
};
