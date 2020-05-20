import { Commander } from './commander';
import { TBSelection } from '../../viewer/selection';

export class CodeCommander implements Commander<string> {
  recordHistory = true;
  private lang = '';

  updateValue(value: string) {
    this.lang = value;
  }

  command(selection: TBSelection, overlap: boolean): void {
  }
}
