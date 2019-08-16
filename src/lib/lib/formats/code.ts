import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { BlockFormatter } from '../toolbar/fomatter/block-formatter';

export const codeHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-code'],
  tooltip: '代码',
  match: {
    tags: ['PRE']
  },
  execCommand: new BlockFormatter('pre')
};
