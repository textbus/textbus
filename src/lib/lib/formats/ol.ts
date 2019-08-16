import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { ListFormatter } from '../toolbar/fomatter/list-formatter';

export const olHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-list-numbered'],
  tooltip: '有序列表',
  match: {
    tags: ['OL']
  },
  execCommand: new ListFormatter('ol')
};
