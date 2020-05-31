import { BoldCommander } from '../commands/bold.commander';
import { boldFormatter } from '../../formatter/bold.formatter';
import { BoldMatcher } from '../matcher/bold.matcher';
import { Toolkit } from '../toolkit/toolkit';

export const boldTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-bold'],
  tooltip: '加粗',
  keymap: {
    ctrlKey: true,
    key: 'b'
  },
  match: new BoldMatcher(),
  execCommand: new BoldCommander(boldFormatter)
});
