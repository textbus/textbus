import { Commander, ReplaceModel } from './commander';
import { TBSelection } from '../selection/selection';
import { Fragment } from '../parser/fragment';
import { FormatState } from '../matcher/matcher';

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

export class TableEditCommander implements Commander<any> {
  recordHistory = true;
  constructor(private type: TableEditActions) {
  }

  command(selection: TBSelection): TBSelection {
    return selection;
  }

  render(state: FormatState, rawElement?: HTMLElement): ReplaceModel {
    return;
  }
}
