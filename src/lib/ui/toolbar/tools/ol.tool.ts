import { ListMatcher } from '../matcher/list.matcher';
import { ListCommander } from '../commands/list.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';

export const olToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-list-numbered'],
  tooltip: i18n => i18n.get('plugins.toolbar.olTool.tooltip'),
  keymap: {
    shiftKey: true,
    ctrlKey: true,
    key: 'o'
  },
  matcher: new ListMatcher('ol', [PreComponent]),
  commanderFactory() {
    return new ListCommander('ol');
  }
};
export const olTool = new ButtonTool(olToolConfig);
