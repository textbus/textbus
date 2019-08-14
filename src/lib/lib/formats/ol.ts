import { ButtonHandler, HandlerType } from '../toolbar/help';
import { ListFormatter } from '../toolbar/list-formatter';

export const olHandler: ButtonHandler = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-list-numbered'],
  tooltip: '有序列表',
  match: {
    tags: ['OL']
  },
  execCommand: new ListFormatter('ol')
};
