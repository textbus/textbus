import { ButtonHandler, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../toolbar/inline-formatter';

export const boldHandler: ButtonHandler = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-bold'],
  tooltip: '加粗',
  match: {
    tags: ['STRONG', 'B']
  },
  execCommand: new InlineFormatter('strong')
};
