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
  matcher: new BlockMatcher(BlockTemplate, ['blockquote']),
  commanderFactory() {
    return new ToggleBlockCommander('blockquote');
  }
});
