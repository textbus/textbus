import { Commander } from './commander';
import { TBSelection } from '../../core/selection';

export class BlockStyleCommander implements Commander<string> {
  recordHistory = true;

  constructor(private name: string) {
  }

  updateValue(value: string): void {
    this.name = value;
  }

  command(selection: TBSelection, overlap: boolean): void {
    console.log(selection)
  }

}
