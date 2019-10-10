import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { EditFrame } from '../edit-frame';
import { MatchStatus } from '../../matcher';

export enum TableEditActions {
  AddColumnToLeft,
  AddColumnToRight,
  AddRowToTop,
  AddRowToBottom,
  mergeCells,
  splitCells,
  deleteTopRow,
  deleteBottomRow,
  deleteLeftColumn,
  deleteRightColumn
}

export class TableEditFormatter implements Formatter {
  readonly recordHistory = true;

  constructor(private type: TableEditActions) {
  }

  format(range: TBRange, frame: EditFrame, matchStatus: MatchStatus): void {
  }
}
