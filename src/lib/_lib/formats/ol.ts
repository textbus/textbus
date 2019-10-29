import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { ListFormatter } from '../edit-frame/fomatter/list-formatter';

export const olHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-list-numbered'],
  tooltip: '有序列表',
  match: {
    tags: ['ol']
  },
  execCommand: new ListFormatter('ol')
};
