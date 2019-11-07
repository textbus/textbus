import { Observable } from 'rxjs';

import { Commander } from './commander';
import { MatchState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class StyleCommander implements Commander {
  constructor(private name: string,
              value: string | number | Observable<string | number>) {
  }

  command(selection: TBSelection, context: Fragment, handler: Handler, overlap: boolean): void {
  }

  render(state: MatchState): HTMLElement {
    return null;
  }
}
