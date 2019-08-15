import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../toolbar/inline-formatter';

export const strikeThroughHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-strikethrough'],
  tooltip: '删除线',
  match: {
    tags: ['STRIKE', 'DEL', 'S']
  },
  execCommand: new InlineFormatter('del')
};
