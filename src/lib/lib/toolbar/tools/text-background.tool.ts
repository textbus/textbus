import { backgroundColorFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';
import { Toolkit } from '../toolkit/toolkit';

export const textBackgroundTool = Toolkit.makeDropdownTool({
  classes: ['tbus-icon-background-color'],
  tooltip: '文字背景颜色',
  menuFactory() {
    return new Palette()
  },
  matcher: new FormatMatcher(backgroundColorFormatter),
  execCommand() {
    return new StyleCommander('backgroundColor', backgroundColorFormatter);
  }
});
