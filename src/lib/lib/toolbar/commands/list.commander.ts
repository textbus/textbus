import { Commander } from './commander';
import { TBSelection } from '../../viewer/selection';

export class ListCommander implements Commander {
  constructor(private tagName: 'ol' | 'ul') {
  }

  recordHistory = true;

  command(selection: TBSelection, overlap: boolean): void {
  }
}
