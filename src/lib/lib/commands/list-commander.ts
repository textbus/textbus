import { Commander, ReplaceModel } from './commander';
import { MatchState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class ListCommander implements Commander {
  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
  }

  render(state: MatchState, rawElement?: HTMLElement): ReplaceModel {
    return;
  }
}
