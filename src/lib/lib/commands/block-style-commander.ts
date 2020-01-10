import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { Contents } from '../parser/contents';
import { AbstractData } from '../toolbar/utils/abstract-data';
import { VElement } from '../renderer/element';
import { RootFragment } from '../parser/root-fragment';
import { Fragment } from '../parser/fragment';

export class BlockStyleCommander implements Commander<string> {
  recordHistory = true;
  private value: string | number;

  constructor(private name: string) {
  }

  updateValue(value: string) {
    this.value = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): void {
    selection.ranges.reduce((v, n) => {
      const contents = new Contents();
      contents.insertElements(n.commonAncestorFragment.sliceContents(0), 0);
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
    }, [] as Fragment[]).forEach(f => {
      f.mergeMatchStates(rootFragment.parser.getFormatStateByData(new AbstractData({
        style: {
          name: this.name,
          value: this.value
        }
      })), 0, f.contentLength, true);
    });
  }

  render(state: FormatState, rawElement?: VElement, cacheData?: AbstractData): ReplaceModel {
    if (rawElement) {
      rawElement.styles.set(cacheData.style.name, cacheData.style.value);
    }
    return null;
  }
}
