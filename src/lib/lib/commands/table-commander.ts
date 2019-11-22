import { Observable } from 'rxjs';

import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { AttrState } from '../toolbar/formats/forms/help';

export class TableCommander implements Commander<any> {
  recordHistory = true;
  constructor(attrs: AttrState[] | Observable<AttrState[]>) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
  }

  render(state: FormatState, rawElement?: HTMLElement): ReplaceModel {
    return;
  }
}
