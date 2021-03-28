import { Palette } from './utils/palette';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';
import { TableEditMatcher } from '../matcher/table-edit.matcher';
import { TdBorderColorCommander } from '../commands/td-border-color.commander';

export const tdBorderColorToolConfig: DropdownToolConfig = {
  iconClasses: ['textbus-icon-table-border'],
  tooltip: '表格边框颜色',
  menuFactory() {
    return new Palette('borderColor');
  },
  matcher: new TableEditMatcher(),
  commanderFactory() {
    return new TdBorderColorCommander();
  }
};
export const tdBorderColorTool = new DropdownTool(tdBorderColorToolConfig);
