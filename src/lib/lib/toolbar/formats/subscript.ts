import { ButtonConfig, HandlerType, inlineHandlerPriority } from '../help';
import { InlineCommander } from '../../commands/inline-commander';

export const subscriptHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-subscript'],
  priority: inlineHandlerPriority,
  tooltip: '下标',
  match: {
    tags: ['sub']
  },
  execCommand: new InlineCommander('sub')
};
