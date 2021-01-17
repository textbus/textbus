import { CommandContext, Commander } from '../../core/_api';
import { TableComponent } from '../../components/_api';

export enum TableEditActions {
  AddColumnToLeft,
  AddColumnToRight,
  AddRowToTop,
  AddRowToBottom,
  MergeCells,
  SplitCells,
  DeleteTopRow,
  DeleteBottomRow,
  DeleteLeftColumn,
  DeleteRightColumn
}

export class TableEditCommander implements Commander<TableEditActions> {
  recordHistory = true;

  command(c: CommandContext, actionType: TableEditActions) {
    const {selection} = c;
    const context = selection.firstRange.startFragment.getContext(TableComponent);
    this.recordHistory = true;
    if (!context) {
      this.recordHistory = false;
      return;
    }
    switch (actionType) {
      case TableEditActions.AddColumnToLeft:
        context.addColumnToLeft();
        break;
      case TableEditActions.AddColumnToRight:
        context.addColumnToRight();
        break;
      case TableEditActions.AddRowToTop:
        context.addRowToTop();
        break;
      case TableEditActions.AddRowToBottom:
        context.addRowToBottom();
        break;
      case TableEditActions.MergeCells:
        context.mergeCells(selection);
        break;
      case TableEditActions.SplitCells:
        context.splitCells(selection);
        break;
      case TableEditActions.DeleteTopRow:
        context.deleteTopRow();
        break;
      case TableEditActions.DeleteBottomRow:
        context.deleteBottomRow();
        break;
      case TableEditActions.DeleteLeftColumn:
        context.deleteLeftColumn();
        break;
      case TableEditActions.DeleteRightColumn:
        context.deleteRightColumn();
        break;
    }
  }
}
