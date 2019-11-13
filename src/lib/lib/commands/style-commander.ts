import { Observable } from 'rxjs';

import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class StyleCommander implements Commander {
  constructor(private name: string,
              value: string | number | Observable<string | number>) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
  }

  render(state: FormatState, rawElement?: HTMLElement): ReplaceModel {
    return;
  }
}
