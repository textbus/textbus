import { Commander, ReplaceModel } from './commander';
import { MatchState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class HistoryCommander implements Commander {
  constructor(private action: 'forward' | 'back') {
  }

  command(selection: TBSelection, context: Fragment, handler: Handler, overlap: boolean): void {
  }

  render(state: MatchState, rawElement?: HTMLElement): ReplaceModel {
    return;
  }
}
