import { backgroundColor } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';
import { Toolkit } from '../toolkit/toolkit';

export const blockBackgroundTool = Toolkit.makeDropdownTool({
  classes: ['tbus-icon-paint-bucket'],
  tooltip: '元素背景颜色',
  menuFactory() {
    return new Palette();
  },
  match: new FormatMatcher(backgroundColor),
  execCommand() {
    return new StyleCommander('backgroundColor', backgroundColor)
  }
});
