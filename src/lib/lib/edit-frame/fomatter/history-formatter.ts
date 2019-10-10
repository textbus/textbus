import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { EditFrame } from '../edit-frame';
import { MatchDescription } from '../../matcher';

export class HistoryFormatter implements Formatter {
  readonly recordHistory = false;

  constructor(private action: 'forward' | 'back') {
  }

  format(range: TBRange, frame: EditFrame, matchDescription: MatchDescription): void {
    switch (this.action) {
      case 'back':
        frame.back();
        break;
      case 'forward':
        frame.forward();
        break;
    }
  }

}
