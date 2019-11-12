import { ChildSlotModel, Commander } from './commander';
import { MatchState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class InlineCommander implements Commander {
  constructor(private tagName: string) {
  }

  command(selection: TBSelection, context: Fragment, handler: Handler, overlap: boolean) {
    selection.ranges.forEach(range => {
      context.apply({
        range,
        handler,
        state: overlap ? MatchState.Normal : MatchState.Matched
      });
    })
  }

  render(state: MatchState, rawElement?: HTMLElement) {
    switch (state) {
      case MatchState.Exclude:
        if (rawElement) {
          rawElement.style.fontWeight = 'normal';
          break;
        } else {
          const node = document.createElement('span');
          node.style.fontWeight = 'normal';
          return new ChildSlotModel(node);
        }
      case MatchState.Matched:
        return new ChildSlotModel(document.createElement(this.tagName));
    }
    return null;
  }
}
