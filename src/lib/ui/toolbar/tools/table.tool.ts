import { Toolkit, GroupConfig, MenuType } from '../toolkit/_api';
import { tableAddToolConfig } from './table-add.tool';
import { tableEditToolConfig } from './table-edit.tool';
import { tableRemoveToolConfig } from './table-remove.tool';
import { tdBorderColorToolConfig } from './td-border-color.tool';
import { TableMatcher } from '../matcher/table.matcher';
import { PreComponent } from '../../../components/pre.component';

export const tableToolConfig: GroupConfig = {
  iconClasses: ['textbus-icon-table'],
  tooltip: '表格',
  matcher: new TableMatcher([PreComponent]),
  menu: [{
    type: MenuType.Dropdown,
    ...tableAddToolConfig,
    label: '创建表格'
  }, {
    type: MenuType.ActionSheet,
    ...tableEditToolConfig,
    label: '编辑表格'
  }, {
    type: MenuType.Dropdown,
    ...tdBorderColorToolConfig,
    label: '设置单元格边框颜色'
  }, {
    type: MenuType.Action,
    ...tableRemoveToolConfig,
    label: '删除表格'
  }]
}
export const tableTool = Toolkit.makeGroupTool(tableToolConfig);
