import { ButtonConfig, HandlerType, Priority } from '../help';
import { ToggleBlockCommander } from '../../commands/toggle-block-commander';

export const blockquoteHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-quotes-right'],
  tooltip: '引用',
  priority: Priority.Block,
  match: {
    tags: ['blockquote'],
    noInTags: ['table', 'pre']
  },
  editable: {
    tag: true
  },
  keymap: {
    ctrlKey: true,
    key: '\''
  },
  execCommand: new ToggleBlockCommander('blockquote')
};
