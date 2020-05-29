import { Commander } from '../../core/commander';
import { TBSelection } from '../../core/selection';
import { AttrState } from '../forms/help';

export class ImageCommander implements Commander<AttrState[]> {
  recordHistory = true;

  updateValue(value: AttrState[]) {
  }

  command(selection: TBSelection, overlap: boolean): void {
    console.log(selection)
  }
}
