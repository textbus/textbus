import { TableEditActions, TableEditCommander } from '../commands/table-edit.commander';
import { ActionSheetToolConfig, Toolkit } from '../toolkit/_api';
import { TableEditMatcher } from '../matcher/table-edit.matcher';

export const tableEditToolConfig: ActionSheetToolConfig = {
  iconClasses: ['textbus-icon-table-edit'],
  tooltip: '编辑表格',
  matcher: new TableEditMatcher(),
  commanderFactory() {
    return new TableEditCommander();
  },
  actions: [{
    label: '在左边添加列',
    value: TableEditActions.AddColumnToLeft,
    iconClasses: ['textbus-icon-table-add-column-left']
  }, {
    label: '在右边添加列',
    value: TableEditActions.AddColumnToRight,
    iconClasses: ['textbus-icon-table-add-column-right']
  }, {
    label: '在上边添加行',
    value: TableEditActions.AddRowToTop,
    iconClasses: ['textbus-icon-table-add-row-top']
  }, {
    label: '在下边添加行',
    value: TableEditActions.AddRowToBottom,
    iconClasses: ['textbus-icon-table-add-row-bottom']
  }, {
    label: '删除左边列',
    value: TableEditActions.DeleteLeftColumn,
    iconClasses: ['textbus-icon-table-delete-column-left']
  }, {
    label: '删除右边列',
    value: TableEditActions.DeleteRightColumn,
    iconClasses: ['textbus-icon-table-delete-column-right']
  }, {
    label: '删除上边行',
    value: TableEditActions.DeleteTopRow,
    iconClasses: ['textbus-icon-table-delete-row-top']
  }, {
    label: '删除下边行',
    value: TableEditActions.DeleteBottomRow,
    iconClasses: ['textbus-icon-table-delete-row-bottom']
  }, {
    label: '合并单元格',
    value: TableEditActions.MergeCells,
    iconClasses: ['textbus-icon-table-split-columns']
  }, {
    label: '取消合并单元格',
    value: TableEditActions.SplitCells,
    iconClasses: ['textbus-icon-table']
  }]
}
export const tableEditTool = Toolkit.makeActionSheetTool(tableEditToolConfig);
