import { ButtonConfig, HandlerType } from '../help';
import { ListMatcher } from '../matcher/list.matcher';
import { ListCommander } from '../commands/list.commander';

export const olTool: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-list-numbered'],
  tooltip: '有序列表',
  keymap: {
    shiftKey: true,
    ctrlKey: true,
    key: 'o'
  },
  match: new ListMatcher('ol'),
  execCommand: new ListCommander('ol')
};
