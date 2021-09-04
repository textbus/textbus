import { PreComponent } from '@textbus/components';

import { GroupConfig, MenuType, GroupTool } from '../toolkit/_api';
import { tableAddToolConfig } from './table-add.tool';
import { tableEditToolConfig } from './table-edit.tool';
import { tableRemoveToolConfig } from './table-remove.tool';
import { tdBorderColorToolConfig } from './td-border-color.tool';
import { TableMatcher } from '../matcher/table.matcher';

export const tableToolConfig: GroupConfig = {
  iconClasses: ['textbus-icon-table'],
  tooltip: i18n => i18n.get('plugins.toolbar.tableTool.tooltip'),
  matcher: new TableMatcher([PreComponent]),
  menu: [{
    type: MenuType.Dropdown,
    ...tableAddToolConfig,
    label: i18n => i18n.get('plugins.toolbar.tableTool.createTable')
  }, {
    type: MenuType.ActionSheet,
    ...tableEditToolConfig,
    label: i18n => i18n.get('plugins.toolbar.tableTool.editTable')
  }, {
    type: MenuType.Dropdown,
    ...tdBorderColorToolConfig,
    label: i18n => i18n.get('plugins.toolbar.tableTool.cellBorderColor')
  }, {
    type: MenuType.Action,
    ...tableRemoveToolConfig,
    label: i18n => i18n.get('plugins.toolbar.tableTool.deleteTable')
  }]
}
export const tableTool = new GroupTool(tableToolConfig);
