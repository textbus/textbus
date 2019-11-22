import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { FormatRange } from '../parser/fragment';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class BlockStyleCommander implements Commander<string> {
  recordHistory = true;
  constructor(private name: string,
              private value: string | number) {
  }

  updateValue(value: string) {
    this.value = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.reduce((v, n) => {
      const contents = n.commonAncestorFragment.contents;
      if (!n.commonAncestorFragment.parent) {
        return v.concat(contents.getFragments());
      } else {
        if (n.startFragment === n.commonAncestorFragment || n.endFragment === n.commonAncestorFragment) {
          v.push(n.commonAncestorFragment);
        } else {
          n.getSelectedScope().map(f => f.context).forEach(f => {
            while (f) {
              if (f.parent === n.commonAncestorFragment) {
                v.push(f);
                break;
              }
              f = f.parent;
            }
          });
        }
      }
      return v;
    }, []).forEach(f => {
      f.apply(new FormatRange({
        startIndex: 0,
        endIndex: f.contents.length,
        state: FormatState.Valid,
        context: f,
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
    if (rawElement) {
      rawElement.style[this.name] = this.value;
    }
    return null;
  }
}
