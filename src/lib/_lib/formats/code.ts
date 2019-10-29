import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { ToggleBlockFormatter } from '../edit-frame/fomatter/toggle-block-formatter';

export const codeHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-code'],
  tooltip: '代码',
  match: {
    tags: ['pre']
  },
  execCommand: new ToggleBlockFormatter('pre')
};
