import { boldFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { BoldCommander } from '../commands/bold.commander';
import { BoldMatcher } from '../matcher/bold.matcher';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';

export const boldToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-bold'],
  tooltip: i18n => i18n.get('plugins.toolbar.boldTool.tooltip'),
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
