import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { FormatRange } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class BlockStyleCommander implements Commander<string> {
  constructor(private name: string,
              private value: string | number) {
  }

  updateValue(value: string) {
    this.value = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.forEach(range => {
      range.commonAncestorFragment.apply(new FormatRange({
        startIndex: 0,
        endIndex: range.commonAncestorFragment.contents.length,
        state: FormatState.Valid,
        context: range.commonAncestorFragment,
        handler,
        cacheData: {
          style: {
            name: this.name,
            value: this.value
          }
        }
      }), true)
    });
  }

  render(state: FormatState, rawElement?: HTMLElement): ReplaceModel {
    return;
  }
}
