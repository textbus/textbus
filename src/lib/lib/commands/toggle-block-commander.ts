import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { FormatRange } from '../parser/format';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { Fragment } from '../parser/fragment';
import { TBRange } from '../viewer/range';

export class ToggleBlockCommander implements Commander {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): Fragment {
    if (overlap) {
      return this.unwrap(selection, handler);
    } else {
      this.unwrap(selection, handler);
      return this.wrap(selection, handler);
    }
  }

  render(state: FormatState, rawElement?: HTMLElement): ReplaceModel {
    if (state === FormatState.Valid) {
      return new ReplaceModel(document.createElement(this.tagName));
    }
    return null;
  }

  private unwrap(selection: TBSelection, handler: Handler) {
    if (selection.rangeCount === 1) {
      const f = this.unwrapParent(selection.commonAncestorFragment, handler);
      if (f) {
        return f;
      }
    }

    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        this.unwrapParent(item.context, handler);
        this.unwrapChild(item.context, item.startIndex, item.endIndex, handler, range);
      })
    });
    return selection.commonAncestorFragment;
  }

  private unwrapChild(fragment: Fragment,
                      startIndex: number,
                      endIndex: number,
                      handler: Handler,
                      range: TBRange) {
    fragment.contents.slice(startIndex, endIndex).forEach(f => {
      if (f instanceof Fragment) {
        this.unwrapChild(f, 0, f.contents.length, handler, range);
      }
    });
    const formatRanges = fragment.formatMatrix.get(handler);
    if (formatRanges && formatRanges.length) {
      const parent = fragment.parent;
      const index = fragment.getIndexInParent();
      parent.delete(index, index + 1);
      parent.insertFragmentContents(fragment, index);
      if (fragment === range.startFragment) {
        range.startFragment = parent;
        range.startIndex += index;
      }
      if (fragment === range.endFragment) {
        range.startFragment = parent;
        range.endIndex += index;
      }
    }
  }

  private unwrapParent(fragment: Fragment, handler: Handler): Fragment {
    const formatRanges = fragment.formatMatrix.get(handler);
    if (formatRanges && formatRanges.length) {
      const parent = fragment.parent;
      const index = fragment.getIndexInParent();
      parent.delete(index, index + 1);
      parent.insertFragmentContents(fragment, index);
      return parent;
    }
    if (fragment.parent) {
      return this.unwrapParent(fragment.parent, handler);
    }
    return null
  }

  private wrap(selection: TBSelection, handler: Handler) {
    if (selection.collapsed) {
      const range = selection.firstRange;
      const commonAncestorFragment = range.commonAncestorFragment;
      const parent = commonAncestorFragment.parent;
      const fragment = new Fragment(parent);
      const index = commonAncestorFragment.getIndexInParent();
      parent.delete(index, index + 1);
      parent.insert(fragment, index);

      fragment.append(commonAncestorFragment);
      fragment.apply(new FormatRange({
        startIndex: 0,
        endIndex: 1,
        state: FormatState.Valid,
        handler,
        context: fragment,
        cacheData: {
          tag: this.tagName
        }
      }), true);
      return parent;
    } else {
      const fragments: Fragment[] = [];
      selection.ranges.forEach(range => {
        let commonAncestorFragment = range.commonAncestorFragment;
        const newFragment = new Fragment(commonAncestorFragment);
        newFragment.mergeFormat(new FormatRange({
          startIndex: 0,
          endIndex: 0,
          state: FormatState.Valid,
          handler,
          cacheData: {
            tag: this.tagName
          },
          context: newFragment
        }));

        if (range.startFragment === commonAncestorFragment &&
          range.endFragment === commonAncestorFragment) {
          const index = commonAncestorFragment.getIndexInParent();
          const parent = commonAncestorFragment.parent;
          parent.delete(index, index + 1);
          newFragment.append(commonAncestorFragment);
          parent.insert(newFragment, index);
          fragments.push(newFragment.parent);
        } else {
          const index = range.getCommonAncestorFragmentScope().startIndex;
          range.getSelectedScope().forEach(item => {
            if (item.context === range.startFragment || item.context === range.endFragment) {
              const index = item.context.getIndexInParent();
              const parent = item.context.parent;
              item.context.parent.delete(index, index + 1);
              newFragment.append(item.context);
              this.deleteEmptyFragment(parent, commonAncestorFragment);
            } else if (item.context.parent === commonAncestorFragment) {
              const index = item.context.getIndexInParent();
              item.context.parent.delete(index, 1);
              newFragment.append(item.context);
            } else {
              newFragment.append(item.context.delete(item.startIndex, item.endIndex));
              this.deleteEmptyFragment(item.context, commonAncestorFragment);
            }
          });
          commonAncestorFragment.insert(newFragment, index);
          fragments.push(commonAncestorFragment);
        }
      });
      return this.getRerenderFragment(fragments);
    }
  }

  private getRerenderFragment(fragments: Fragment[]): Fragment {
    if (fragments.length === 1) {
      return fragments[0];
    }

    const depth: Fragment[][] = [];

    fragments.forEach(fragment => {
      const tree = [];
      while (fragment) {
        tree.push(fragment);
        fragment = fragment.parent;
      }
      depth.push(tree);
    });

    let fragment: Fragment = null;

    while (true) {
      const firstFragments = depth.map(arr => arr.pop()).filter(i => i);
      if (firstFragments.length === depth.length) {
        if (new Set(firstFragments).size === 1) {
          fragment = firstFragments[0];
        } else {
          break;
        }
      }
    }
    return fragment;
  }

  private deleteEmptyFragment(fragment: Fragment, scope: Fragment) {
    if (fragment === scope) {
      return;
    }
    if (fragment.contents.length === 0) {
      const parent = fragment.parent;
      fragment.destroy();
      this.deleteEmptyFragment(parent, scope);
    }
  }
}
