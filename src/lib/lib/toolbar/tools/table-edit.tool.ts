import { BlockMatcher } from '../matcher/block.matcher';
import { TableEditActions, TableEditCommander } from '../commands/table-edit.commander';
import { TableTemplate } from '../../templates/table.template';
import { Toolkit } from '../toolkit/toolkit';

export const tableEditTool = Toolkit.makeActionSheetTool({
  classes: ['tbus-icon-table-edit'],
  tooltip: '编辑表格',
  match: new BlockMatcher(TableTemplate),
  execCommand: new TableEditCommander(),
  actions: [{
    label: '在左边添加列',
    value: TableEditActions.AddColumnToLeft,
    classes: ['tbus-icon-table-add-column-left'],
    keymap: {
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      key: 'l'
    }
  }, {
    label: '在右边添加列',
    value: TableEditActions.AddColumnToRight,
    classes: ['tbus-icon-table-add-column-right'],
    keymap: {
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      key: 'r'
    }
  }, {
    label: '在上边添加行',
    value: TableEditActions.AddRowToTop,
    classes: ['tbus-icon-table-add-row-top'],
    keymap: {
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      key: 't'
    }
  }, {
    label: '在下边添加行',
    value: TableEditActions.AddRowToBottom,
    classes: ['tbus-icon-table-add-row-bottom'],
    keymap: {
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      key: 'b'
    }
  }, {
    label: '删除左边列',
    value: TableEditActions.DeleteLeftColumn,
    classes: ['tbus-icon-table-delete-column-left'],
    keymap: {
      ctrlKey: true,
      altKey: true,
      key: 'l'
    }
  }, {
    label: '删除右边列',
    value: TableEditActions.DeleteRightColumn,
    classes: ['tbus-icon-table-delete-column-right'],
    keymap: {
      ctrlKey: true,
      altKey: true,
      key: 'r'
    }
  }, {
    label: '删除上边行',
    value: TableEditActions.DeleteTopRow,
    classes: ['tbus-icon-table-delete-row-top'],
    keymap: {
      ctrlKey: true,
      altKey: true,
      key: 't'
    }
  }, {
    label: '删除下边行',
    value: TableEditActions.DeleteBottomRow,
    classes: ['tbus-icon-table-delete-row-bottom'],
    keymap: {
      ctrlKey: true,
      altKey: true,
      key: 'b'
    }
  }, {
    label: '合并单元格',
    value: TableEditActions.MergeCells,
    classes: ['tbus-icon-table-split-columns'],
    keymap: {
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      key: 'm'
    }
  }, {
    label: '取消合并单元格',
    value: TableEditActions.SplitCells,
    classes: ['tbus-icon-table'],
    keymap: {
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      key: 's'
    }
  }]
});
