import { Commander } from './commander';
import { TBSelection } from '../selection/selection';
import { Fragment } from '../parser/fragment';

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

export class TableEdit implements Commander {
  constructor(private type: TableEditActions) {
  }

  command(selection: TBSelection, context: Fragment): void {

  }
}
