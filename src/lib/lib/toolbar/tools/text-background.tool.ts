import { Subject } from 'rxjs';

import { DropdownConfig, ToolType } from '../help';
import { backgroundColor } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';

const hideEvent = new Subject<void>();
const commander = new StyleCommander('backgroundColor', backgroundColor);

export const textBackgroundTool: DropdownConfig = {
  type: ToolType.Dropdown,
  classes: ['tbus-icon-background-color'],
  tooltip: '文字背景颜色',
  viewer: new Palette(commander, hideEvent),
  onHide: hideEvent.asObservable(),
  match: new FormatMatcher(backgroundColor),
  execCommand: commander
};
