import { Commander } from '../../core/commander';
import { TBSelection } from '../../core/selection';

export class CodeCommander implements Commander<string> {
  recordHistory = true;
  private lang = '';

  updateValue(value: string) {
    this.lang = value;
  }

  command(selection: TBSelection, overlap: boolean): void {
  }
}
