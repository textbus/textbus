import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { EditFrame } from '../edit-frame';
import { MatchDelta } from '../../matcher';

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

  format(range: TBRange, frame: EditFrame, matchDelta: MatchDelta): void {
    console.log(range.rawRange);
  }
}
