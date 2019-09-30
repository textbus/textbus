import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../frame/fomatter/inline-formatter';

export const subscriptHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-subscript'],
  tooltip: '下标',
  match: {
    tags: ['sub']
  },
  execCommand: new InlineFormatter('sub')
};
