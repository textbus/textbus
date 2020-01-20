import { ButtonConfig, HandlerType, Priority } from '../help';
import { ListCommander } from '../../commands/list-commander';

export const ulHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-list'],
  priority: Priority.Block,
  tooltip: '无序列表',
  editable: {
    tag: true
  },
  match: {
    tags: ['ul'],
    noInTags: ['pre']
  },
  keymap: {
    shiftKey: true,
    ctrlKey: true,
    key: 'u'
  },
  execCommand: new ListCommander('ul')
};
