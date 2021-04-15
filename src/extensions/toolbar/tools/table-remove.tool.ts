import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { TableEditMatcher } from '../matcher/table-edit.matcher';
import { TableRemoveCommander } from '../commands/table-remove.commander';

export const tableRemoveToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-table-remove'],
  tooltip: i18n => i18n.get('plugins.toolbar.tableRemoveTool.tooltip'),
  matcher: new TableEditMatcher(),
  commanderFactory() {
    return new TableRemoveCommander();
  }
}
export const tableRemoveTool = new ButtonTool(tableRemoveToolConfig);
