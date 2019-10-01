import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { EditFrame } from '../edit-frame';
import { MatchStatus } from '../../matcher';

export class HistoryFormatter implements Formatter {
  constructor(private action: 'forward' | 'back') {
  }

  format(range: TBRange, frame: EditFrame, matchStatus: MatchStatus): void {
  }

}
