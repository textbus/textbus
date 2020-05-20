import { Commander } from './commander';
import { TBSelection } from '../../viewer/selection';

export class HistoryCommander implements Commander {
  recordHistory = false;

  constructor(private type: 'forward' | 'back') {
  }

  command(selection: TBSelection, overlap: boolean): void {
  }
}
