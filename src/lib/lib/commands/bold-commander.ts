import { Commander } from './commander';
import { TBSelection } from '../viewer/selection';
import { Formatter } from '../core/formatter';

export class BoldCommander implements Commander<Formatter> {
  recordHistory = true;

  command(selection: TBSelection, handler: Formatter, overlap: boolean) {

  }
}
