import { Toolkit } from '../toolkit/toolkit';
import { ToggleBlockCommander } from '../commands/toggle-block.commander';
import { BlockMatcher } from '../matcher/block.matcher';
import { BlockComponent } from '../../components/block.component';

export const blockquoteTool = Toolkit.makeButtonTool({
  classes: ['textbus-icon-quotes-right'],
  tooltip: '引用',
  keymap: {
    ctrlKey: true,
    key: '\''
  },
  matcher: new BlockMatcher(BlockComponent, ['blockquote']),
  commanderFactory() {
    return new ToggleBlockCommander('blockquote');
  }
});
