import { Palette } from './utils/palette';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';
import { TableEditMatcher } from '../matcher/table-edit.matcher';
import { TdBorderColorCommander } from '../commands/td-border-color.commander';

export const tdBorderColorToolConfig: DropdownToolConfig = {
  iconClasses: ['textbus-icon-table-border'],
  tooltip: i18n => i18n.get('plugins.toolbar.tdBorderColorTool.tooltip'),
  viewFactory(i18n) {
    return new Palette('borderColor', i18n.get('plugins.toolbar.tdBorderColorTool.view.confirmBtnText'));
  },
  matcher: new TableEditMatcher(),
  commanderFactory() {
    return new TdBorderColorCommander();
  }
};
export const tdBorderColorTool = new DropdownTool(tdBorderColorToolConfig);
