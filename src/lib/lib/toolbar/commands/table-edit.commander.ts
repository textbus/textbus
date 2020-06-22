import { ActionCommander, Renderer, TBSelection } from '../../core/_api';
import { TableCell, TableTemplate } from '@tanbo/tbus/templates/table.template';

export interface CellPosition {
  beforeCell: TableCell;
  afterCell: TableCell;
  columnOffset: number;
  rowOffset: number;
  row: CellPosition[];
  cell: TableCell;
  rowIndex?: number;
  columnIndex?: number;
}

export interface TableSelectionRange {
  startPosition: CellPosition;
  endPosition: CellPosition;
}

export interface RowPosition {
  beforeRow: TableCell[];
  afterRow: TableCell[];
  cellsPosition: CellPosition[];
  cells: TableCell[];
}

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
  cellMatrix: RowPosition[];
  startPosition: CellPosition;
  endPosition: CellPosition;
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
    const cellMatrix = this.params.cellMatrix;
    const index = this.params.startPosition.columnIndex;
    cellMatrix.forEach(row => {
      const cell = row.cellsPosition[index];
      const fragment = (cell.cellElement[TBUS_TOKEN] as Token).context;
      if (index === 0) {
        fragment.parent.insert(TableEditCommander.createCell('td', parser), 0);
      } else {
        if (cell.columnOffset === 0) {
          fragment.parent.insert(TableEditCommander.createCell('td', parser), fragment.getIndexInParent());
        } else if (cell.rowOffset === 0) {
          parser.createFormatDeltasByAbstractData(new AbstractData({
            tag: 'td',
            attrs: {
              colspan: cell.cellElement.colSpan + 1,
              rowspan: cell.cellElement.rowSpan
            }
          })).forEach(item => {
            fragment.mergeFormat(new BlockFormat({
              ...item,
              context: fragment
            }))
          });
        }
      }
    });
    if (this.params.startPosition.cellElement === this.params.endPosition.cellElement) {
      this.params.startPosition.columnIndex++;
    } else {
      this.params.startPosition.columnIndex++;
      this.params.endPosition.columnIndex++;
    }
  }
}
