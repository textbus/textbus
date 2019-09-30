import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { ToggleBlockFormatter } from '../frame/fomatter/toggle-block-formatter';

export const blockquoteHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-quotes-right'],
  tooltip: '引用',
  match: {
    tags: ['blockquote']
  },
  execCommand: new ToggleBlockFormatter('blockquote')
};
