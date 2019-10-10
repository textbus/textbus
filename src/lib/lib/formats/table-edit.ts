import { ActionSheetHandlerOption, HandlerType } from '../toolbar/help';
import { TableEditActions, TableEditFormatter } from '../edit-frame/fomatter/table-edit-formatter';
import { EditFrame } from '../edit-frame/edit-frame';
import { MatchState } from '../matcher';

export const tableEditHandler: ActionSheetHandlerOption = {
  type: HandlerType.ActionSheet,
  classes: ['tanbo-editor-icon-table-edit'],
  tooltip: '编辑表格',
  actions: [{
    label: '在左边添加列',
    execCommand: new TableEditFormatter(TableEditActions.AddColumnToLeft),
    match: {
      tags: ['td', 'th'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-add-column-left']
  }, {
    label: '在右边添加列',
    execCommand: new TableEditFormatter(TableEditActions.AddColumnToRight),
    match: {
      tags: ['td', 'th'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-add-column-right']
  }, {
    label: '在上边添加行',
    execCommand: new TableEditFormatter(TableEditActions.AddRowToTop),
    match: {
      tags: ['td', 'th'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-add-row-top']
  }, {
    label: '在下边添加行',
    execCommand: new TableEditFormatter(TableEditActions.AddRowToBottom),
    match: {
      tags: ['td', 'th'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-add-row-bottom']
  }, {
    label: '删除左边列',
    execCommand: new TableEditFormatter(TableEditActions.deleteLeftColumn),
    match: {
      tags: ['td', 'th'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-delete-column-left']
  }, {
    label: '删除右边列',
    execCommand: new TableEditFormatter(TableEditActions.deleteRightColumn),
    match: {
      tags: ['td', 'th'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-delete-column-right']
  }, {
    label: '删除上边行',
    execCommand: new TableEditFormatter(TableEditActions.deleteTopRow),
    match: {
      tags: ['td', 'th'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-delete-row-top']
  }, {
    label: '删除下边行',
    execCommand: new TableEditFormatter(TableEditActions.deleteBottomRow),
    match: {
      tags: ['td', 'th'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-delete-row-bottom']
  }, {
    label: '合并单元格',
    execCommand: new TableEditFormatter(TableEditActions.mergeCells),
    match: {
      tags: ['td', 'th'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-split-columns']
  }, {
    label: '取消合并单元格',
    execCommand: new TableEditFormatter(TableEditActions.splitCells),
    match: {
      tags: ['td', 'th'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table']
  }]
};
