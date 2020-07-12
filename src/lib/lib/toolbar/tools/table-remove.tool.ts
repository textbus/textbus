import { Toolkit } from '../toolkit/toolkit';
import { TableEditMatcher } from '../matcher/table-edit.matcher';
import { TableRemoveCommander } from '../commands/table-remove.commander';

export const tableRemoveTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-table'],
  label: 'X',
  tooltip: '删除表格',
  matcher: new TableEditMatcher(),
  commanderFactory() {
    return new TableRemoveCommander();
  }
});
