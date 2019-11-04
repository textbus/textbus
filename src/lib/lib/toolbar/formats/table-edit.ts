import { ActionSheetConfig, HandlerType } from '../help';
import { TableEdit, TableEditActions } from '../../commands/table-edit';

export const tableEditHandler: ActionSheetConfig = {
  type: HandlerType.ActionSheet,
  classes: ['tanbo-editor-icon-table-edit'],
  tooltip: '编辑表格',
  actions: [{
    label: '在左边添加列',
    execCommand: new TableEdit(TableEditActions.AddColumnToLeft),
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-add-column-left']
  }, {
    label: '在右边添加列',
    execCommand: new TableEdit(TableEditActions.AddColumnToRight),
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-add-column-right']
  }, {
    label: '在上边添加行',
    execCommand: new TableEdit(TableEditActions.AddRowToTop),
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-add-row-top']
  }, {
    label: '在下边添加行',
    execCommand: new TableEdit(TableEditActions.AddRowToBottom),
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-add-row-bottom']
  }, {
    label: '删除左边列',
    execCommand: new TableEdit(TableEditActions.DeleteLeftColumn),
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-delete-column-left']
  }, {
    label: '删除右边列',
    execCommand: new TableEdit(TableEditActions.DeleteRightColumn),
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-delete-column-right']
  }, {
    label: '删除上边行',
    execCommand: new TableEdit(TableEditActions.DeleteTopRow),
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-delete-row-top']
  }, {
    label: '删除下边行',
    execCommand: new TableEdit(TableEditActions.DeleteBottomRow),
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-delete-row-bottom']
  }, {
    label: '合并单元格',
    execCommand: new TableEdit(TableEditActions.MergeCells),
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-split-columns']
  }, {
    label: '取消合并单元格',
    execCommand: new TableEdit(TableEditActions.SplitCells),
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table']
  }]
};
