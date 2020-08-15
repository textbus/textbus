import { colorFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';
import { Toolkit } from '../toolkit/toolkit';
import { PreComponent } from '../../components/pre.component';

export const colorToolConfig = {
  iconClasses: ['textbus-icon-color'],
  tooltip: '文字颜色',
  menuFactory() {
    return new Palette('color');
  },
  matcher: new FormatMatcher(colorFormatter, [PreComponent]),
  commanderFactory() {
    return new StyleCommander('color', colorFormatter);
  }
};
export const colorTool = Toolkit.makeDropdownTool(colorToolConfig);
