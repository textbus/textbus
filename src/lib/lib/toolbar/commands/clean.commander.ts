import { Commander } from './commander';
import { TBSelection } from '../../core/selection';

export class CleanCommander implements Commander {
  recordHistory = true;
  command(selection: TBSelection, overlap: boolean): void {
  }
}
