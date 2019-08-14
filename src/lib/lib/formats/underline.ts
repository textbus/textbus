import { ButtonHandler, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../toolbar/inline-formatter';

export const underlineHandler: ButtonHandler = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-underline'],
  tooltip: '下划线',
  match: {
    tags: ['U']
  },
  execCommand: new InlineFormatter('u')
};
