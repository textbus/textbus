import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { FormatRange, Fragment } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class BlockCommander implements Commander<string> {

  constructor(private tagName: string) {
  }

  updateValue(value: string): void {
    this.tagName = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.forEach(range => {
      if (range.commonAncestorFragment === range.startFragment && range.commonAncestorFragment === range.endFragment) {
        const f = new FormatRange({
          startIndex: 0,
          endIndex: range.commonAncestorFragment.contents.length,
          handler,
          context: range.commonAncestorFragment,
          state: FormatState.Valid
        });
        range.commonAncestorFragment.apply(f, true);
      } else {
        const scope = range.getCommonAncestorFragmentScope();
        const contents = range.commonAncestorFragment.contents.slice(scope.startIndex, scope.endIndex);
        contents.forEach(item => {
          if (item instanceof Fragment) {
            item.apply(new FormatRange({
              startIndex: 0,
              endIndex: item.contents.length,
              handler,
              context: item,
              state: FormatState.Valid
            }), true);
          }
        })
      }
    })
  }

  render(state: FormatState, rawElement?: HTMLElement): ReplaceModel {
    if (rawElement && rawElement.tagName.toLowerCase() === this.tagName) {
      return null;
    }
    return new ReplaceModel(document.createElement(this.tagName));
  }
}
