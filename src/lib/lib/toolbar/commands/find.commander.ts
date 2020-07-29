import { Commander, Fragment, Renderer, TBSelection } from '../../core/_api';

export class FindCommander implements Commander<boolean> {
  recordHistory = false;

  updateValue(value: boolean) {
    this.recordHistory = value;
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer, rootFragment: Fragment) {

  }
}
