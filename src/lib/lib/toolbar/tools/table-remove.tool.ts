import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
import { TableEditMatcher } from '../matcher/table-edit.matcher';
import { TableRemoveCommander } from '../commands/table-remove.commander';

export const tableRemoveToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-table-remove'],
  tooltip: '删除表格',
  matcher: new TableEditMatcher(),
  commanderFactory() {
    return new TableRemoveCommander();
  }
}
export const tableRemoveTool = Toolkit.makeButtonTool(tableRemoveToolConfig);
