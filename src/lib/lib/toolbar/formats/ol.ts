import { ButtonConfig, HandlerType, Priority } from '../help';
import { ListCommander } from '../../commands/list-commander';

export const olHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-list-numbered'],
  priority: Priority.Block,
  tooltip: '有序列表',
  editable: {
    tag: true
  },
  match: {
    tags: ['ol'],
    noInTags: ['pre']
  },
  execCommand: new ListCommander('ol')
};
