import { BoldCommander } from '../commands/bold.commander';
import { boldFormatter } from '../../../formatter/bold.formatter';
import { BoldMatcher } from '../matcher/bold.matcher';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';

export const boldToolConfig: ButtonToolConfig = {
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
export const boldTool = new ButtonTool(boldToolConfig);
