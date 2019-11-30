import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { FormatRange } from '../parser/format-range';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class ToggleBlockCommander implements Commander<any> {
  recordHistory = true;
  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.forEach(range => {
      const formatMatrix = range.commonAncestorFragment.formatMatrix;
      Array.from(formatMatrix.keys()).forEach(key => {
        if (key.execCommand instanceof ToggleBlockCommander && key !== handler) {
          formatMatrix.delete(key);
        }
      });
      range.commonAncestorFragment.apply(new FormatRange({
        startIndex: 0,
        endIndex: range.commonAncestorFragment.contents.length,
        state: overlap ? FormatState.Invalid : FormatState.Valid,
        handler,
        context: range.commonAncestorFragment,
        cacheData: {
          tag: this.tagName
        }
      }), true)
    });
  }

  render(state: FormatState, rawElement?: HTMLElement): ReplaceModel {
    if (state === FormatState.Valid) {
      return new ReplaceModel(document.createElement(this.tagName));
    }
    return null;
  }
}
