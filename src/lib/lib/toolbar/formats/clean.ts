import { ButtonConfig, HandlerType, inlineHandlerPriority } from '../help';
import { BlockCommander } from '../../commands/block-commander';

export const cleanHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-clean'],
  tooltip: '清除格式',
  priority: inlineHandlerPriority,
  execCommand: new BlockCommander('')
};
