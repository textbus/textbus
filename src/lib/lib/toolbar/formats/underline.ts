import { ButtonConfig, HandlerType } from '../help';
import { InlineCommander } from '../../commands/inline-commander';

export const underlineHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-underline'],
  tooltip: '下划线',
  match: {
    tags: ['u']
  },
  execCommand: new InlineCommander('u')
};
