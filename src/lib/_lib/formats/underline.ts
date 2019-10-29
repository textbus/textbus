import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../edit-frame/fomatter/inline-formatter';

export const underlineHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-underline'],
  tooltip: '下划线',
  match: {
    tags: ['u']
  },
  execCommand: new InlineFormatter('u')
};
