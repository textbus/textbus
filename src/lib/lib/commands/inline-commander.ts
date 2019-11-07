import { Commander } from './commander';
import { MatchState } from '../matcher/matcher';
import { FormatRange, Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class InlineCommander implements Commander {
  constructor(private tagName: string) {
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

  render(state: MatchState, rawElement?: HTMLElement): HTMLElement {
    switch (state) {
      case MatchState.Exclude:
        if (rawElement) {
          rawElement.style.fontWeight = 'normal';
          break;
        } else {
          const node = document.createElement('span');
          node.style.fontWeight = 'normal';
          return node;
        }
      case MatchState.Matched:
        return document.createElement(this.tagName);
    }
  }
}
