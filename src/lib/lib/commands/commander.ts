import { MatchState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export interface Commander {
  command(selection: TBSelection, context: Fragment, handler: Handler, overlap: boolean): void;

  render(state: MatchState): HTMLElement;
}
