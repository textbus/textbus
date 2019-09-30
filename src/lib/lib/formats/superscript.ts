import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../frame/fomatter/inline-formatter';

export const superscriptHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-superscript'],
  tooltip: '上标',
  match: {
    tags: ['sup']
  },
  execCommand: new InlineFormatter('sup')
};
