import { ButtonConfig, HandlerType, blockHandlerPriority } from '../help';
import { ToggleBlockCommander } from '../../commands/toggle-block-commander';

export const blockquoteHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-quotes-right'],
  tooltip: '引用',
  priority: blockHandlerPriority,
  match: {
    tags: ['blockquote']
  },
  execCommand: new ToggleBlockCommander('blockquote')
};
