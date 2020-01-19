import { InlineCommander } from '../../commands/inline-commander';
import { ButtonConfig, HandlerType, Priority } from '../help';

export const italicHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-italic'],
  priority: Priority.Inline,
  tooltip: '斜体',
  editable: {
    tag: true
  },
  match: {
    tags: ['em', 'i'],
    styles: {
      fontStyle: ['italic']
    },
    excludeStyles: {
      fontStyle: /(?!italic).+/
    },
    noInTags: ['pre']
  },
  keymap: {
    ctrlKey: true,
    key: 'i'
  },
  execCommand: new InlineCommander('em')
};
