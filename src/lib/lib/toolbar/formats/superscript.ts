import { ButtonConfig, HandlerType, Priority } from '../help';
import { InlineCommander } from '../../commands/inline-commander';

export const superscriptHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-superscript'],
  priority: Priority.Inline,
  tooltip: '上标',
  editable: {
    tag: true
  },
  match: {
    tags: ['sup']
  },
  execCommand: new InlineCommander('sup')
};
