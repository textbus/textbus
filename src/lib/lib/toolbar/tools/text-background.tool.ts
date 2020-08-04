import { backgroundColorFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';
import { Toolkit } from '../toolkit/toolkit';
import { PreComponent } from '../../components/pre.component';

export const textBackgroundTool = Toolkit.makeDropdownTool({
  classes: ['textbus-icon-background-color'],
  tooltip: '文字背景颜色',
  menuFactory() {
    return new Palette('backgroundColor')
  },
  matcher: new FormatMatcher(backgroundColorFormatter, [PreComponent]),
  commanderFactory() {
    return new StyleCommander('backgroundColor', backgroundColorFormatter);
  }
});
