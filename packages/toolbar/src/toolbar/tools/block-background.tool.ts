import { blockBackgroundColorFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';
import { BlockStyleCommander } from '../commands/block-style.commander';

export const blockBackgroundToolConfig: DropdownToolConfig = {
  iconClasses: ['textbus-icon-paint-bucket'],
  tooltip: i18n => i18n.get('plugins.toolbar.blockBackgroundColorTool.tooltip'),
  viewFactory(i18n) {
    return new Palette('backgroundColor', i18n.get('plugins.toolbar.blockBackgroundColorTool.view.btnText'));
  },
  matcher: new FormatMatcher(blockBackgroundColorFormatter, [PreComponent]),
  commanderFactory() {
    return new BlockStyleCommander('backgroundColor', blockBackgroundColorFormatter);
  }
}

export const blockBackgroundTool = new DropdownTool(blockBackgroundToolConfig);
