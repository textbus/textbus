import { Toolkit } from '../toolkit/toolkit';
import { TableEditMatcher } from '../matcher/table-edit.matcher';
import { TableRemoveCommander } from '../commands/table-remove.commander';

export const tableRemoveToolConfig = {
  iconClasses: ['textbus-icon-table-remove'],
  tooltip: '删除表格',
  matcher: new TableEditMatcher(),
  commanderFactory() {
    return new TableRemoveCommander();
  }
}
export const tableRemoveTool = Toolkit.makeButtonTool(tableRemoveToolConfig);
