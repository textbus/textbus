import { ButtonConfig, HandlerType, Priority } from '../help';
import { ToggleBlockCommander } from '../../commands/toggle-block-commander';

export const blockquoteHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-quotes-right'],
  tooltip: '引用',
  priority: Priority.Block,
  styleSheets: [`blockquote {
  padding: 10px 15px;
  border-left: 10px solid $color-gray-light;
  background-color: $color-lighter;
  margin: 1em 0;
  border-radius: 4px;
}`],
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
