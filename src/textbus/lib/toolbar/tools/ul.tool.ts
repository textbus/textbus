import { ListMatcher } from '../matcher/list.matcher';
import { ListCommander } from '../commands/list.commander';
import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
import { PreComponent } from '../../components/pre.component';

export const ulToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-list'],
  tooltip: '无序列表',
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
export const ulTool = Toolkit.makeButtonTool(ulToolConfig);
