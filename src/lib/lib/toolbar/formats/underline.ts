import { ButtonConfig, HandlerType, Priority } from '../help';
import { InlineCommander } from '../../commands/inline-commander';

export const underlineHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-underline'],
  priority: Priority.Inline,
  tooltip: '下划线',
  editable: {
    tag: true
  },
  match: {
    tags: ['u'],
    noInTags: ['pre']
  },
  keymap: {
    ctrlKey: true,
    key: 'u'
  },
  execCommand: new InlineCommander('u')
};
