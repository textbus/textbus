import { PreComponent } from '@textbus/components';
import { colorFormatter } from '@textbus/formatters';

import { StyleCommander } from '../commands/style.commander';
import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';

export const colorToolConfig: DropdownToolConfig = {
  iconClasses: ['textbus-icon-color'],
  tooltip: i18n => i18n.get('plugins.toolbar.colorTool.tooltip'),
  keymap: {
    ctrlKey: true,
    shiftKey: true,
    key: 'c'
  },
  viewFactory(i18n) {
    return new Palette('color', i18n.get('plugins.toolbar.colorTool.view.btnText'));
  },
  matcher: new FormatMatcher(colorFormatter, [PreComponent]),
  commanderFactory() {
    return new StyleCommander('color', colorFormatter);
  }
};
export const colorTool = new DropdownTool(colorToolConfig);
