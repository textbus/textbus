import { ButtonHandler, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../toolbar/inline-formatter';

export const italicHandler: ButtonHandler = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-italic'],
  tooltip: '斜体',
  match: {
    tags: ['EM', 'I']
  },
  execCommand: new InlineFormatter('em')
};
