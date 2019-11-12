import { ButtonConfig, HandlerType, inlineHandlerPriority } from '../help';
import { InlineCommander } from '../../commands/inline-commander';

export const strikeThroughHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-strikethrough'],
  priority: inlineHandlerPriority,
  tooltip: '删除线',
  match: {
    tags: ['strike', 'del', 's']
  },
  execCommand: new InlineCommander('del')
};
