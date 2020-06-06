import { Toolkit } from '../toolkit/toolkit';
import { ToggleBlockCommander } from '../commands/toggle-block.commander';
import { BlockMatcher } from '../matcher/block.matcher';
import { BlockTemplate } from '../../templates/block.template';

export const blockquoteTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-quotes-right'],
  tooltip: '引用',
  keymap: {
    ctrlKey: true,
    key: '\''
  },
  match: new BlockMatcher(BlockTemplate, 'blockquote'),
  execCommand() {
    return new ToggleBlockCommander('blockquote');
  }
});
