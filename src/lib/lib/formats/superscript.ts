import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../toolbar/fomatter/inline-formatter';

export const superscriptHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-superscript'],
  tooltip: '上标',
  match: {
    tags: ['SUP']
  },
  execCommand: new InlineFormatter('superscript')
};
