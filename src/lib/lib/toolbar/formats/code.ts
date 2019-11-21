import { ButtonConfig, HandlerType, Priority } from '../help';
import { CodeCommander } from '../../commands/code-commander';

export const codeHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-code'],
  tooltip: '代码',
  priority: Priority.Block,
  editable: {
    tag: true
  },
  match: {
    tags: ['pre']
  },
  execCommand: new CodeCommander()
};
