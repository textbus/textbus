import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { Fragment } from '../parser/fragment';
import { TBRange } from '../viewer/range';
import { BlockFormat } from '../parser/format';
import { FormatState } from '../matcher/matcher';

export function unwrap(selection: TBSelection, handler: Handler) {
  if (selection.rangeCount === 1) {
    const f = unwrapParent(selection.commonAncestorFragment, handler);
    if (f) {
      return f;
    }
  }

  selection.ranges.forEach(range => {
    range.getSelectedScope().forEach(item => {
      unwrapParent(item.context, handler);
      unwrapChild(item.context, item.startIndex, item.endIndex, handler, range);
    })
  });
  return selection.commonAncestorFragment;
}

export function unwrapChild(fragment: Fragment,
                            startIndex: number,
                            endIndex: number,
                            handler: Handler,
                            range: TBRange) {
  fragment.sliceContents(startIndex, endIndex).forEach(f => {
    if (f instanceof Fragment) {
      unwrapChild(f, 0, f.contentLength, handler, range);
    }
  });
  const formatRanges = fragment.getFormatRangesByHandler(handler);
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

export function unwrapParent(fragment: Fragment, handler: Handler): Fragment {
  const formatRanges = fragment.getFormatRangesByHandler(handler);
  if (formatRanges && formatRanges.length) {
    const parent = fragment.parent;
    const index = fragment.getIndexInParent();
    parent.delete(index, index + 1);
    parent.insertFragmentContents(fragment, index);
    return parent;
  }
  if (fragment.parent) {
    return unwrapParent(fragment.parent, handler);
  }
  return null
}


export function wrap(selection: TBSelection, handler: Handler, tagName: string, attrs?: Map<string, string>) {
  if (selection.collapsed) {
    const range = selection.firstRange;
    const commonAncestorFragment = range.commonAncestorFragment;
    const parent = commonAncestorFragment.parent;
    const fragment = new Fragment();
    const index = commonAncestorFragment.getIndexInParent();
    parent.delete(index, index + 1);
    parent.insert(fragment, index);

    fragment.append(commonAncestorFragment);
    fragment.apply(new BlockFormat({
      state: FormatState.Valid,
      handler,
      context: fragment,
      cacheData: {
        tag: tagName,
        attrs
      }
    }), true);
    return parent;
  } else {
    const fragments: Fragment[] = [];
    selection.ranges.forEach(range => {
      let commonAncestorFragment = range.commonAncestorFragment;
      const newFragment = new Fragment();
      newFragment.mergeFormat(new BlockFormat({
        state: FormatState.Valid,
        handler,
        cacheData: {
          tag: tagName,
          attrs
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
        const scopes = range.getSelectedScope();
        scopes.forEach(item => {
          if (item.context === range.startFragment || item.context === range.endFragment) {
            const index = item.context.getIndexInParent();
            const parent = item.context.parent;
            item.context.parent.delete(index, index + 1);
            newFragment.append(item.context);
            const s = deleteEmptyFragment(parent, commonAncestorFragment);
            if (s === commonAncestorFragment) {
              scopes.forEach(i => {
                i.startIndex--;
                i.endIndex--;
              })
            }
          } else if (item.context === commonAncestorFragment) {
            newFragment.append(item.context.delete(item.startIndex, item.endIndex));
            scopes.forEach(i => {
              i.startIndex--;
              i.endIndex--;
            })
          } else {
            const index = item.context.getIndexInParent();
            item.context.parent.delete(index, 1);
            newFragment.append(item.context);
            const s = deleteEmptyFragment(item.context, commonAncestorFragment);
            if (s === commonAncestorFragment) {
              scopes.forEach(i => {
                i.startIndex--;
                i.endIndex--;
              })
            }
          }
        });
        commonAncestorFragment.insert(newFragment, index);
        fragments.push(commonAncestorFragment);
      }
    });
    return getRerenderFragment(fragments);
  }
}

export function deleteEmptyFragment(fragment: Fragment, scope: Fragment) {
  if (fragment === scope) {
    return fragment;
  }
  if (fragment.contentLength === 0) {
    const parent = fragment.parent;
    fragment.destroy();
    deleteEmptyFragment(parent, scope);
  }
}

export function getRerenderFragment(fragments: Fragment[]): Fragment {
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
