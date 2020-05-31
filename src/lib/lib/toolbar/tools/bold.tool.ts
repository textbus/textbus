import { ButtonConfig, ToolType } from '../help';
import { BoldCommander } from '../commands/bold.commander';
import { boldFormatter } from '../../formatter/bold.formatter';
import { BoldMatcher } from '../matcher/bold.matcher';

export const boldTool: ButtonConfig = {
  type: ToolType.Button,
  classes: ['tbus-icon-bold'],
  tooltip: '加粗',
  keymap: {
    ctrlKey: true,
    key: 'b'
  },
  match: new BoldMatcher(),
  execCommand: new BoldCommander(boldFormatter)
};
