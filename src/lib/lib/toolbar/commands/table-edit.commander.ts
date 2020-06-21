import { Commander, TBSelection } from '../../core/_api';

export interface CellPosition {
  rowElement: HTMLTableRowElement;
  beforeCell: Element;
  afterCell: Element;
  cellElement: HTMLTableCellElement;
  columnOffset: number;
  rowOffset: number;
  rowIndex?: number;
  columnIndex?: number;
}

export interface TableSelectionRange {
  startPosition: CellPosition;
  endPosition: CellPosition;
}

export interface RowPosition {
  beforeRow: Element;
  afterRow: Element;
  rowElement: HTMLTableRowElement;
  cells: CellPosition[];
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

export class TableEditCommander implements Commander<TableEditParams> {
  recordHistory = true;
  actionType: TableEditActions;
  private params: TableEditParams;

  updateValue(value: TableEditParams): void {
    this.params = value;
  }

  command(selection: TBSelection, overlap: boolean) {
    console.log(this.params)
    alert('新版正在开发中，可以先使用老版本 @tanbo/tbus@0.0.1-alpha.*');
  }

}
