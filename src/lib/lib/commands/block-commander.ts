import { Commander } from './commander';
import { MatchState } from '../matcher/matcher';
import { FormatRange, Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class BlockCommander implements Commander {
  constructor(private tagName: string) {
  }

  command(selection: TBSelection, context: Fragment, handler: Handler, overlap: boolean): void {
    debugger;
    context.apply(new FormatRange(
      selection.firstRange.startIndex,
      selection.firstRange.endIndex,
      overlap ? MatchState.Normal : MatchState.Matched,
      handler,
      context
    ));
  }

  render(state: MatchState, rawElement?: HTMLElement): HTMLElement {
    // console.log(rawElement, this)
    if (rawElement && rawElement.tagName.toLowerCase() === this.tagName) {
      return rawElement;
    }
    return document.createElement(this.tagName);
  }
}
