import { Commander } from './commander';
import { TBSelection } from '../viewer/selection';
import { Formatter } from '../core/formatter';

export class BoldCommander implements Commander<Formatter> {
  recordHistory = true;

  constructor(private formatter: Formatter) {
  }

  command(selection: TBSelection, overlap: boolean): void {
  }
}
