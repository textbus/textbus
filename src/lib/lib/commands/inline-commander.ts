import { ChildSlotModel, Commander } from './commander';
import { MatchState } from '../matcher/matcher';
import { FormatRange } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class InlineCommander implements Commander {
  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        const r = new FormatRange(
          item.startIndex,
          item.endIndex,
          overlap ? MatchState.Normal : MatchState.Matched,
          handler,
          item.context
        );
        item.context.apply(r, false);
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
