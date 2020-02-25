import { Commander, RenderModel, ReplaceModel } from './commander';
import { MatchState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { Contents } from '../parser/contents';
import { AbstractData } from '../parser/abstract-data';
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
      f.mergeMatchStates(rootFragment.parser.createFormatDeltasByAbstractData(new AbstractData({
        style: {
          name: this.name,
          value: this.value
        }
      })), 0, f.contentLength, true);
    });
  }

  render(state: MatchState, abstractData: AbstractData, rawElement?: VElement): RenderModel {
    if (rawElement) {
      rawElement.styles.set(abstractData.style.name, abstractData.style.value);
    }
    return null;
  }
}
