import { Subject } from 'rxjs';

import { DropdownConfig, ToolType } from '../help';
import { colorFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';

const hideEvent = new Subject<void>();
const commander = new StyleCommander('color', colorFormatter);

export const colorTool: DropdownConfig = {
  type: ToolType.Dropdown,
  classes: ['tbus-icon-color'],
  tooltip: '文字颜色',
  viewer: new Palette(commander, hideEvent),
  onHide: hideEvent.asObservable(),
  match: new FormatMatcher(colorFormatter),
  execCommand: commander
};
