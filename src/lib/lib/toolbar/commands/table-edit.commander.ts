import { ActionCommander, Fragment, Renderer, TBSelection } from '../../core/_api';
import { TableCellPosition, TableTemplate, SingleTagTemplate } from '../../templates/_api';

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

export interface TableEditParams {
  startPosition: TableCellPosition;
  endPosition: TableCellPosition;
}

export class TableEditCommander implements ActionCommander<TableEditParams> {
  recordHistory = true;
  private actionType: TableEditActions;
  private params: TableEditParams;

  setActionType(type: TableEditActions) {
    this.actionType = type;
  }

  updateValue(value: TableEditParams): void {
    this.params = value;
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer) {
    const context = renderer.getContext(selection.firstRange.startFragment, TableTemplate);
    switch (this.actionType) {
      case TableEditActions.AddColumnToLeft:
        this.addColumnToLeft(context);
        break;
      // case TableEditActions.AddColumnToRight:
      //   this.addColumnToRight(rootFragment.parser);
      //   break;
      // case TableEditActions.AddRowToTop:
      //   this.addRowToTop(rootFragment.parser);
      //   break;
      // case TableEditActions.AddRowToBottom:
      //   this.addRowToBottom(rootFragment.parser);
      //   break;
      // case TableEditActions.MergeCells:
      //   this.mergeCells(selection, rootFragment.parser);
      //   break;
      // case TableEditActions.SplitCells:
      //   this.splitCells(selection, rootFragment.parser);
      //   break;
      // case TableEditActions.DeleteTopRow:
      //   this.deleteTopRow(rootFragment.parser);
      //   break;
      // case TableEditActions.DeleteBottomRow:
      //   this.deleteBottomRow(rootFragment.parser);
      //   break;
      // case TableEditActions.DeleteLeftColumn:
      //   this.deleteLeftColumn(rootFragment.parser);
      //   break;
      // case TableEditActions.DeleteRightColumn:
      //   this.deleteRightColumn(rootFragment.parser);
      //   break;
    }
  }

  private addColumnToLeft(context: TableTemplate) {
    const cellMatrix = context.cellMatrix;
    const index = this.params.startPosition.columnIndex;
    cellMatrix.forEach(row => {
      const cell = row.cellsPosition[index];
      if (index === 0) {
        cell.row.unshift(TableEditCommander.createCell());
      } else {
        if (cell.offsetColumn === 0) {
          cell.row.splice(cell.row.indexOf(cell.cell), 0, TableEditCommander.createCell());
        } else if (cell.offsetRow === 0) {
          cell.cell.colspan++;
        }
      }
    });
    if (this.params.startPosition.cell === this.params.endPosition.cell) {
      this.params.startPosition.columnIndex++;
    } else {
      this.params.startPosition.columnIndex++;
      this.params.endPosition.columnIndex++;
    }
  }

  private static createCell() {
    const fragment = new Fragment();
    fragment.append(new SingleTagTemplate('br'));
    return {
      rowspan: 1,
      colspan: 1,
      fragment
    };
  }
}
