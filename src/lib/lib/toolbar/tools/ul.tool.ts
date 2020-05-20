import { ButtonConfig, HandlerType } from '../help';
import { ListMatcher } from '../matcher/list.matcher';
import { ListCommander } from '../commands/list.commander';

export const ulTool: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-list'],
  tooltip: '无序列表',
  keymap: {
    shiftKey: true,
    ctrlKey: true,
    key: 'u'
  },
  match: new ListMatcher('ul'),
  execCommand: new ListCommander('ul')
};
