import { ButtonHandler, HandlerType } from '../toolbar/help';
import { InlineFormatter } from '../toolbar/inline-formatter';

export const superscriptHandler: ButtonHandler = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-superscript'],
  tooltip: '上标',
  match: {
    tags: ['SUP']
  },
  execCommand: new InlineFormatter('superscript')
};
