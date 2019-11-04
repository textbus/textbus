import { Commander } from './commander';
import { MatchState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';

export class InlineCommander implements Commander {
  constructor(private tagName: string,
              private inheritTags: string[] = []) {
  }

  command(selection: TBSelection, context: Fragment): TBSelection {
    return selection;
  }

  render(state: MatchState, context: Fragment): Element {
    return state === MatchState.Matched && !this.inheritTags.includes(context.tagName) ?
      document.createElement(this.tagName) : null;
  }
}
