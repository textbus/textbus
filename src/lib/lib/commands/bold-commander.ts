import { FormatCommander } from './commander';
import { TBSelection } from '../viewer/selection';
import { Formatter } from '../core/formatter';

export class BoldCommander implements FormatCommander {
  recordHistory = true;

  command(selection: TBSelection, handler: Formatter, overlap: boolean) {

  }
}
