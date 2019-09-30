import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../frame/fomatter/inline-formatter';

export const strikeThroughHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-strikethrough'],
  tooltip: '删除线',
  match: {
    tags: ['strike', 'del', 's']
  },
  execCommand: new InlineFormatter('del')
};
