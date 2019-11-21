import { ActionSheetConfig, HandlerType, Priority } from '../help';
import { TableEditActions, TableEditCommander } from '../../commands/table-edit-commander';
import { TableEditHook } from '../hooks/table-edit-hook';

export const tableEditHandler: ActionSheetConfig = {
  type: HandlerType.ActionSheet,
  classes: ['tanbo-editor-icon-table-edit'],
  tooltip: '编辑表格',
  hooks: new TableEditHook(),
  actions: [{
    label: '在左边添加列',
    execCommand: new TableEditCommander(TableEditActions.AddColumnToLeft),
    priority: Priority.Block,
    editable: null,
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-add-column-left']
  }, {
    label: '在右边添加列',
    execCommand: new TableEditCommander(TableEditActions.AddColumnToRight),
    priority: Priority.Block,
    editable: null,
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-add-column-right']
  }, {
    label: '在上边添加行',
    execCommand: new TableEditCommander(TableEditActions.AddRowToTop),
    priority: Priority.Block,
    editable: null,
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-add-row-top']
  }, {
    label: '在下边添加行',
    execCommand: new TableEditCommander(TableEditActions.AddRowToBottom),
    priority: Priority.Block,
    editable: null,
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-add-row-bottom']
  }, {
    label: '删除左边列',
    execCommand: new TableEditCommander(TableEditActions.DeleteLeftColumn),
    priority: Priority.Block,
    editable: null,
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-delete-column-left']
  }, {
    label: '删除右边列',
    execCommand: new TableEditCommander(TableEditActions.DeleteRightColumn),
    priority: Priority.Block,
    editable: null,
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-delete-column-right']
  }, {
    label: '删除上边行',
    execCommand: new TableEditCommander(TableEditActions.DeleteTopRow),
    priority: Priority.Block,
    editable: null,
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-delete-row-top']
  }, {
    label: '删除下边行',
    execCommand: new TableEditCommander(TableEditActions.DeleteBottomRow),
    priority: Priority.Block,
    editable: null,
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-delete-row-bottom']
  }, {
    label: '合并单元格',
    execCommand: new TableEditCommander(TableEditActions.MergeCells),
    priority: Priority.Block,
    editable: null,
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table-split-columns']
  }, {
    label: '取消合并单元格',
    execCommand: new TableEditCommander(TableEditActions.SplitCells),
    priority: Priority.Block,
    editable: null,
    match: {
      tags: ['table']
    },
    classes: ['tanbo-editor-icon-table']
  }]
};
