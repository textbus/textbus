import { ListMatcher } from '../matcher/list.matcher';
import { ListCommander } from '../commands/list.commander';
import { Toolkit } from '../toolkit/toolkit';

export const olTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-list-numbered'],
  tooltip: '有序列表',
  keymap: {
    shiftKey: true,
    ctrlKey: true,
    key: 'o'
  },
  matcher: new ListMatcher('ol'),
  execCommand() {
    return new ListCommander('ol');
  }
});
