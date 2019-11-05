import { Commander } from './commander';
import { MatchState } from '../matcher/matcher';
import { FormatRange, Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class InlineCommander implements Commander {
  constructor(private tagName: string,
              private inheritTags: string[] = []) {
  }

  command(selection: TBSelection, context: Fragment, handler: Handler) {
    context.apply(new FormatRange(
      selection.firstRange.startIndex,
      selection.firstRange.endIndex,
      MatchState.Matched,
      handler,
      context
    ));
  }

  render(state: MatchState, context: Fragment): Element {
    return state === MatchState.Matched && !this.inheritTags.includes(context.tagName) ?
      document.createElement(this.tagName) : null;
  }
}
