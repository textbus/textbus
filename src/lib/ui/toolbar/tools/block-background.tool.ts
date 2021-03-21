import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';
import { DropdownToolConfig, Toolkit } from '../toolkit/_api';
import { BlockStyleCommander } from '../commands/block-style.commander';
import { blockBackgroundColorFormatter } from '../../../formatter/block-style.formatter';
import { PreComponent } from '../../../components/pre.component';

export const blockBackgroundToolConfig: DropdownToolConfig = {
  iconClasses: ['textbus-icon-paint-bucket'],
  tooltip: '元素背景颜色',
  menuFactory() {
    return new Palette('backgroundColor');
  },
  matcher: new FormatMatcher(blockBackgroundColorFormatter, [PreComponent]),
  commanderFactory() {
    return new BlockStyleCommander('backgroundColor', blockBackgroundColorFormatter);
  }
}

export const blockBackgroundTool = Toolkit.makeDropdownTool(blockBackgroundToolConfig);
