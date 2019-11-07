import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../edit-frame/fomatter/inline-formatter';

export const boldHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  registerName: 'boldHandler',
  classes: ['tanbo-editor-icon-boldHandler'],
  tooltip: '加粗',
  match: {
    tags: ['strong', 'b']
  },
  execCommand: new InlineFormatter('strong')
};
