import { BoldCommander } from '../commands/bold.commander';
import { boldFormatter } from '../../../formatter/bold.formatter';
import { BoldMatcher } from '../matcher/bold.matcher';
import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
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
export const boldTool = Toolkit.makeButtonTool(boldToolConfig);
