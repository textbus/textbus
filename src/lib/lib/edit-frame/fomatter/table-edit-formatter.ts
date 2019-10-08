import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { EditFrame } from '../edit-frame';
import { MatchStatus } from '../../matcher';

export class TableEditFormatter implements Formatter {
  readonly recordHistory = true;

  format(range: TBRange, frame: EditFrame, matchStatus: MatchStatus): void {
  }
}
