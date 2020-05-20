import { ButtonConfig, HandlerType } from '../help';
import { BoldCommander } from '../../commands/bold.commander';
import { boldFormatter } from '../../formatter/bold.formatter';
import { FormatMatcher } from '../../matcher/format.matcher';

export const boldTool: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-bold'],
  tooltip: '加粗',
  keymap: {
    ctrlKey: true,
    key: 'b'
  },
  match: new FormatMatcher(boldFormatter),
  execCommand: new BoldCommander(boldFormatter)
};
