import { TableComponent } from '@textbus/components';

import { CommandContext, Commander } from '../commander';

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
        context.addColumnToLeft(selection);
        break;
      case TableEditActions.AddColumnToRight:
        context.addColumnToRight(selection);
        break;
      case TableEditActions.AddRowToTop:
        context.addRowToTop(selection);
        break;
      case TableEditActions.AddRowToBottom:
        context.addRowToBottom(selection);
        break;
      case TableEditActions.MergeCells:
        context.mergeCells(selection);
        break;
      case TableEditActions.SplitCells:
        context.splitCells(selection);
        break;
      case TableEditActions.DeleteTopRow:
        context.deleteTopRow(selection);
        break;
      case TableEditActions.DeleteBottomRow:
        context.deleteBottomRow(selection);
        break;
      case TableEditActions.DeleteLeftColumn:
        context.deleteLeftColumn(selection);
        break;
      case TableEditActions.DeleteRightColumn:
        context.deleteRightColumn(selection);
        break;
    }
  }
}
