import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { ToggleBlockFormatter } from '../editor/fomatter/toggle-block-formatter';

export const blockquoteHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-quotes-right'],
  tooltip: '引用',
  match: {
    tags: ['BLOCKQUOTE']
  },
  execCommand: new ToggleBlockFormatter('blockquote')
};
