import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../frame/fomatter/inline-formatter';

export const italicHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-italic'],
  tooltip: '斜体',
  match: {
    tags: ['em', 'i']
  },
  execCommand: new InlineFormatter('em')
};
