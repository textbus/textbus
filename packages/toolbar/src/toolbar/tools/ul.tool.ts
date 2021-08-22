import { PreComponent } from '@textbus/components';

import { ListMatcher } from '../matcher/list.matcher';
import { ListCommander } from '../commands/list.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';

export const ulToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-list'],
  tooltip: i18n => i18n.get('plugins.toolbar.ulTool.tooltip'),
  keymap: {
    shiftKey: true,
    ctrlKey: true,
    key: 'u'
  },
  matcher: new ListMatcher('ul', [PreComponent]),
  commanderFactory() {
    return new ListCommander('ul');
  }
};
export const ulTool = new ButtonTool(ulToolConfig);
