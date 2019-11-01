import { MatchState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';

export interface Commander {
  command(state: MatchState, context: Fragment): Element;
}
