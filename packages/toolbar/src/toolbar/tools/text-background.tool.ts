import { backgroundColorFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { StyleCommander } from '../commands/style.commander';
import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';

export const textBackgroundToolConfig: DropdownToolConfig = {
  iconClasses: ['textbus-icon-background-color'],
  tooltip: i18n => i18n.get('plugins.toolbar.textBackgroundColorTool.tooltip'),
  viewFactory(i18n) {
    return new Palette('backgroundColor', i18n.get('plugins.toolbar.textBackgroundColorTool.view.confirmBtnText'))
  },
  matcher: new FormatMatcher(backgroundColorFormatter, [PreComponent]),
  commanderFactory() {
    return new StyleCommander('backgroundColor', backgroundColorFormatter);
  }
};
export const textBackgroundTool = new DropdownTool(textBackgroundToolConfig);
