import { BoldCommander } from '../commands/bold.commander';
import { boldFormatter } from '../../formatter/bold.formatter';
import { BoldMatcher } from '../matcher/bold.matcher';
import { Toolkit } from '../toolkit/toolkit';
import { PreComponent } from '../../components/pre.component';

export const boldToolConfig = {
  iconClasses: ['textbus-icon-bold'],
  tooltip: '加粗',
  keymap: {
    ctrlKey: true,
    key: 'b'
  },
  matcher: new BoldMatcher([PreComponent]),
  commanderFactory() {
    return new BoldCommander(boldFormatter);
  }
};
export const boldTool = Toolkit.makeButtonTool(boldToolConfig);
