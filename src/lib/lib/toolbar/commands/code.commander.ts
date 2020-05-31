import { Commander, TBSelection } from '../../core/_api';

export class CodeCommander implements Commander<string> {
  recordHistory = true;
  private lang = '';

  updateValue(value: string) {
    this.lang = value;
  }

  command(selection: TBSelection, overlap: boolean): void {
  }
}
