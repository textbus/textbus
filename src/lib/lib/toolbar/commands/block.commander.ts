import { Commander } from './commander';
import { TBSelection } from '../../viewer/selection';

export class BlockCommander implements Commander<string> {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  updateValue(value: string): void {
    this.tagName = value;
  }

  command(selection: TBSelection, overlap: boolean): void {
    console.log(selection)
  }

}
