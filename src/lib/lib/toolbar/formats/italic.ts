import { Inline } from '../../commands/inline';
import { ButtonConfig, HandlerType } from '../help';

export const italic: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-italic'],
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
  execCommand: new Inline()
};
