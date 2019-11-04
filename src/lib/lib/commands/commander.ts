import { MatchState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';

export interface Commander {
  command(selection: TBSelection, context: Fragment): TBSelection;

  render?(state: MatchState, context: Fragment): Element;
}
