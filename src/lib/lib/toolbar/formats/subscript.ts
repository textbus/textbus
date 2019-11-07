import { ButtonConfig, HandlerType } from '../help';
import { InlineCommander } from '../../commands/inline-commander';

export const subscriptHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-subscript'],
  tooltip: '下标',
  match: {
    tags: ['sub']
  },
  execCommand: new InlineCommander('sub')
};
