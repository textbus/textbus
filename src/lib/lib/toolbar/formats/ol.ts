import { blockHandlerPriority, ButtonConfig, HandlerType } from '../help';
import { ListCommander } from '../../commands/list-commander';

export const olHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-list-numbered'],
  priority: blockHandlerPriority,
  tooltip: '有序列表',
  match: {
    tags: ['ol']
  },
  execCommand: new ListCommander('ol')
};
