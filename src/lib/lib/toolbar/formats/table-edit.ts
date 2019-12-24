import { ActionSheetConfig, HandlerType, Priority } from '../help';
import { TableEditActions, TableEditCommander } from '../../commands/table-edit-commander';
import { TableEditHook } from '../hooks/table-edit-hook';

export const tableEditHandler: ActionSheetConfig = {
  type: HandlerType.ActionSheet,
  classes: ['tanbo-editor-icon-table-edit'],
  tooltip: '编辑表格',
  hook: new TableEditHook(),
  execCommand: new TableEditCommander(),
  editable: null,
  priority: Priority.Block,
  match: {
    tags: ['td', 'th'],
    noInTags: ['pre']
  },
  actions: [{
    label: '在左边添加列',
    value: TableEditActions.AddColumnToLeft,
    classes: ['tanbo-editor-icon-table-add-column-left']
  }, {
    label: '在右边添加列',
    value: TableEditActions.AddColumnToRight,
    classes: ['tanbo-editor-icon-table-add-column-right']
  }, {
    label: '在上边添加行',
    value: TableEditActions.AddRowToTop,
    classes: ['tanbo-editor-icon-table-add-row-top']
  }, {
    label: '在下边添加行',
    value: TableEditActions.AddRowToBottom,
    classes: ['tanbo-editor-icon-table-add-row-bottom']
  }, {
    label: '删除左边列',
    value: TableEditActions.DeleteLeftColumn,
    classes: ['tanbo-editor-icon-table-delete-column-left']
  }, {
    label: '删除右边列',
    value: TableEditActions.DeleteRightColumn,
    classes: ['tanbo-editor-icon-table-delete-column-right']
  }, {
    label: '删除上边行',
    value: TableEditActions.DeleteTopRow,
    classes: ['tanbo-editor-icon-table-delete-row-top']
  }, {
    label: '删除下边行',
    value: TableEditActions.DeleteBottomRow,
    classes: ['tanbo-editor-icon-table-delete-row-bottom']
  }, {
    label: '合并单元格',
    value: TableEditActions.MergeCells,
    classes: ['tanbo-editor-icon-table-split-columns']
  }, {
    label: '取消合并单元格',
    value: TableEditActions.SplitCells,
    classes: ['tanbo-editor-icon-table']
  }]
};
