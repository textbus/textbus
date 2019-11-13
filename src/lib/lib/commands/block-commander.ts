import { Commander, ReplaceModel } from './commander';
import { MatchState } from '../matcher/matcher';
import { FormatRange, Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class BlockCommander implements Commander {
  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    // context.apply(new FormatRange(
    //   selection.firstRange.startIndex,
    //   selection.firstRange.endIndex,
    //   overlap ? MatchState.Normal : MatchState.Matched,
    //   handler,
    //   context
    // ));
  }

  render(state: MatchState, rawElement?: HTMLElement): ReplaceModel {
    if (rawElement && rawElement.tagName.toLowerCase() === this.tagName) {
      return null;
    }
    return new ReplaceModel(document.createElement(this.tagName));
  }
}
