import { colorFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';
import { Toolkit } from '../toolkit/toolkit';

export const colorTool = Toolkit.makeDropdownTool({
  classes: ['tbus-icon-color'],
  tooltip: '文字颜色',
  menuFactory() {
    return new Palette();
  },
  matcher: new FormatMatcher(colorFormatter),
  execCommand() {
    return new StyleCommander('color', colorFormatter);
  }
});
