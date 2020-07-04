import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';
import { Toolkit } from '../toolkit/toolkit';
import { BlockStyleCommander } from '../commands/block-style.commander';
import { blockBackgroundColorFormatter } from '../../formatter/block-style.formatter';

export const blockBackgroundTool = Toolkit.makeDropdownTool({
  classes: ['tbus-icon-paint-bucket'],
  tooltip: '元素背景颜色',
  menuFactory() {
    return new Palette();
  },
  matcher: new FormatMatcher(blockBackgroundColorFormatter),
  commanderFactory() {
    return new BlockStyleCommander('backgroundColor', blockBackgroundColorFormatter);
  }
});
