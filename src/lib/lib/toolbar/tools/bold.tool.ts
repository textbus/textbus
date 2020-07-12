import { BoldCommander } from '../commands/bold.commander';
import { boldFormatter } from '../../formatter/bold.formatter';
import { BoldMatcher } from '../matcher/bold.matcher';
import { Toolkit } from '../toolkit/toolkit';
import { PreTemplate } from '../../templates/pre.template';

export const boldTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-bold'],
  tooltip: '加粗',
  keymap: {
    ctrlKey: true,
    key: 'b'
  },
  matcher: new BoldMatcher([PreTemplate]),
  commanderFactory() {
    return new BoldCommander(boldFormatter);
  }
});
