import { ButtonHandler, HandlerType } from '../toolbar/help';
import { ListFormatter } from '../toolbar/list-formatter';

export const ulHandler: ButtonHandler = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-list'],
  tooltip: '无序列表',
  match: {
    tags: ['UL']
  },
  execCommand: new ListFormatter('ul')
};
