import { Commander, RenderModel, ReplaceModel } from './commander';
import { MatchState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { AbstractData } from '../parser/abstract-data';
import { VElement } from '../renderer/element';
import { RootFragment } from '../parser/root-fragment';
import { Fragment } from '../parser/fragment';

export class BlockCommander implements Commander<string> {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  updateValue(value: string): void {
    this.tagName = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): void {
    selection.ranges.forEach(range => {
      if (range.commonAncestorFragment === range.startFragment && range.commonAncestorFragment === range.endFragment) {
        range.commonAncestorFragment.mergeMatchStates(
          rootFragment.parser.createFormatDeltasByAbstractData(new AbstractData({
            tag: this.tagName
          })), 0, range.commonAncestorFragment.contentLength, false);
      } else {
        const matchStates = rootFragment.parser.createFormatDeltasByAbstractData(new AbstractData({
          tag: this.tagName
        }));
        const parent = range.commonAncestorFragment.parent;
        const position = range.getCommonAncestorFragmentScope().startIndex;
        const fragments: Fragment[] = [];
        range.getBlockFragmentsBySelectedScope().reverse().forEach(item => {
          const fragment = new Fragment(matchStates.map(i => {
            return Object.assign({}, i);
          }));
          fragment.insertFragmentContents(item.context.delete(item.startIndex, item.endIndex), 0);
          fragments.push(fragment);
          this.deleteEmptyFragment(item.context, parent);
        });
        fragments.forEach(f => {
          parent.insert(f, position);
        });
      }
    })
  }

  render(state: MatchState, abstractData: AbstractData, rawElement?: VElement): RenderModel {
    return new ReplaceModel(new VElement(abstractData ? abstractData.tag : this.tagName));
  }

  private deleteEmptyFragment(fragment: Fragment, scope: Fragment) {
    if (!fragment || fragment === scope) {
      return;
    }
    const parent = fragment.parent;
    if (fragment.contentLength === 0) {
      fragment.destroy();
    }
    this.deleteEmptyFragment(parent, scope);
  }
}
