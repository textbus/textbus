import { ButtonHandler, HandlerType } from '../toolbar/help';
import { Editor } from '../editor/editor';
import { BlockFormatter } from '../toolbar/block-formatter';

export const codeHandler: ButtonHandler = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-code'],
  tooltip: '代码',
  match: {
    tags: ['PRE']
  },
  execCommand: new BlockFormatter('')
};
