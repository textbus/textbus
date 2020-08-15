import { Toolkit } from '../toolkit/toolkit';
import { GroupConfig, MenuType } from '../toolkit/group.handler';
import { tableAddToolConfig } from './table-add.tool';
import { tableEditToolConfig } from './table-edit.tool';
import { tableAddParagraphToolConfig } from './table-add-paragraph.tool';
import { tableRemoveToolConfig } from './table-remove.tool';
import { tdBorderColorToolConfig } from './td-border-color.tool';

export const tableToolConfig: GroupConfig = {
  iconClasses: ['textbus-icon-table'],
  tooltip: '表格',
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
    ...tableAddParagraphToolConfig,
    label: '在表格后添加段落'
  }, {
    type: MenuType.Action,
    ...tableRemoveToolConfig,
    label: '删除表格'
  }]
}
export const tableTool = Toolkit.makeGroupTool(tableToolConfig);
