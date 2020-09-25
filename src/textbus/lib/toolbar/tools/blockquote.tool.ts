import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
import { ToggleBlockCommander } from '../commands/toggle-block.commander';
import { BlockMatcher } from '../matcher/block.matcher';
import { BlockComponent } from '../../components/block.component';

export const blockquoteToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-quotes-right'],
  tooltip: '引用',
  keymap: {
    ctrlKey: true,
    key: '\''
  },
  matcher: new BlockMatcher(BlockComponent, ['blockquote']),
  commanderFactory() {
    return new ToggleBlockCommander('blockquote');
  }
}
export const blockquoteTool = Toolkit.makeButtonTool(blockquoteToolConfig);