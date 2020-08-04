import { ListMatcher } from '../matcher/list.matcher';
import { ListCommander } from '../commands/list.commander';
import { Toolkit } from '../toolkit/toolkit';
import { PreComponent } from '../../components/pre.component';

export const ulTool = Toolkit.makeButtonTool({
  classes: ['textbus-icon-list'],
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
});
