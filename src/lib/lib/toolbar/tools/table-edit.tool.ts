import { TableEditActions, TableEditCommander } from '../commands/table-edit.commander';
import { Toolkit } from '../toolkit/toolkit';
import { TableEditMatcher } from '../matcher/table-edit.matcher';

export const tableEditTool = Toolkit.makeActionSheetTool({
  classes: ['textbus-icon-table-edit'],
  tooltip: '编辑表格',
  matcher: new TableEditMatcher(),
  commanderFactory() {
    return new TableEditCommander();
  },
  actions: [{
    label: '在左边添加列',
    value: TableEditActions.AddColumnToLeft,
    classes: ['textbus-icon-table-add-column-left']
  }, {
    label: '在右边添加列',
    value: TableEditActions.AddColumnToRight,
    classes: ['textbus-icon-table-add-column-right']
  }, {
    label: '在上边添加行',
    value: TableEditActions.AddRowToTop,
    classes: ['textbus-icon-table-add-row-top']
  }, {
    label: '在下边添加行',
    value: TableEditActions.AddRowToBottom,
    classes: ['textbus-icon-table-add-row-bottom']
  }, {
    label: '删除左边列',
    value: TableEditActions.DeleteLeftColumn,
    classes: ['textbus-icon-table-delete-column-left']
  }, {
    label: '删除右边列',
    value: TableEditActions.DeleteRightColumn,
    classes: ['textbus-icon-table-delete-column-right']
  }, {
    label: '删除上边行',
    value: TableEditActions.DeleteTopRow,
    classes: ['textbus-icon-table-delete-row-top']
  }, {
    label: '删除下边行',
    value: TableEditActions.DeleteBottomRow,
    classes: ['textbus-icon-table-delete-row-bottom']
  }, {
    label: '合并单元格',
    value: TableEditActions.MergeCells,
    classes: ['textbus-icon-table-split-columns']
  }, {
    label: '取消合并单元格',
    value: TableEditActions.SplitCells,
    classes: ['textbus-icon-table']
  }]
});
