import { ButtonConfig, HandlerType, Priority } from '../help';
import { InlineCommander } from '../../commands/inline-commander';

export const strikeThroughHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-strikethrough'],
  priority: Priority.Inline,
  tooltip: '删除线',
  editable: {
    tag: true
  },
  match: {
    tags: ['strike', 'del', 's']
  },
  execCommand: new InlineCommander('del')
};
