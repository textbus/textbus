import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../editor/fomatter/inline-formatter';

export const boldHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-bold'],
  tooltip: '加粗',
  match: {
    tags: ['STRONG', 'B']
  },
  execCommand: new InlineFormatter('strong')
};
