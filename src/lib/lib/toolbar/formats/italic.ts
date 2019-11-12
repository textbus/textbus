import { InlineCommander } from '../../commands/inline-commander';
import { ButtonConfig, HandlerType, inlineHandlerPriority } from '../help';

export const italicHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-italic'],
  priority: inlineHandlerPriority,
  tooltip: '斜体',
  match: {
    tags: ['em', 'i'],
    styles: {
      fontStyle: ['italic']
    },
    excludeStyles: {
      fontStyle: /(?!italic).+/
    }
  },
  execCommand: new InlineCommander('em')
};
