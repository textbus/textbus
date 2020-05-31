import { Subject } from 'rxjs';

import { backgroundColor } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';
import { Toolkit } from '../toolkit/toolkit';

const hideEvent = new Subject<void>();
const commander = new StyleCommander('backgroundColor', backgroundColor);

export const textBackgroundTool = Toolkit.makeDropdownTool({
  classes: ['tbus-icon-background-color'],
  tooltip: '文字背景颜色',
  viewer: new Palette(commander, hideEvent),
  onHide: hideEvent.asObservable(),
  match: new FormatMatcher(backgroundColor),
  execCommand: commander
});
