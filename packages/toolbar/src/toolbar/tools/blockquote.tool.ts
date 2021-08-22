import { BlockComponent } from '@textbus/components';

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { ToggleBlockCommander } from '../commands/toggle-block.commander';
import { BlockMatcher } from '../matcher/block.matcher';

export const blockquoteToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-quotes-right'],
  tooltip: i18n => i18n.get('plugins.toolbar.blockquoteTool.tooltip'),
  keymap: /win(dows|32|64)/i.test(navigator.userAgent) ? { // windows 下无法触发 ctrl + ' 号 keydown 事件，原因未知
    altKey: true,
    key: '\''
  } : {
    ctrlKey: true,
    key: '\''
  },
  matcher: new BlockMatcher(BlockComponent, ['blockquote']),
  commanderFactory() {
    return new ToggleBlockCommander('blockquote');
  }
}
export const blockquoteTool = new ButtonTool(blockquoteToolConfig);
