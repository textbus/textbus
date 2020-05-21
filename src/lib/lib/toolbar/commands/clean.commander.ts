import { Commander } from './commander';
import { TBSelection } from '../../viewer/selection';

export class CleanCommander implements Commander {
  recordHistory = true;
  command(selection: TBSelection, overlap: boolean): void {
  }
}
