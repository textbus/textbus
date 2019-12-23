import { Fragment } from '../parser/fragment';
import { TBRange, TBRangePosition } from './range';

export interface RangePath {
  startPaths: number[];
  endPaths: number[];
}

export class TBSelection {

  get ranges(): TBRange[] {
    return this._ranges;
  };

  get commonAncestorFragment() {
    return this.getCommonFragment();
  };

  get rangeCount() {
    return this.ranges.length;
  }

  get firstRange() {
    return this.ranges[0] || null;
  }

  get lastRange() {
    return this.ranges[this.ranges.length - 1] || null;
  }

  get collapsed() {
    return this.ranges.length === 1 && this.firstRange.collapsed;
  }

  private _ranges: TBRange[] = [];

  constructor(private context: Document) {
  }

  removeAllRanges() {
    this._ranges = [];
  }

  addRange(range: TBRange) {
    this._ranges.push(range);
  }

  clone() {
    const t = new TBSelection(this.context);
    t._ranges = this.ranges.map(r => r.clone());
    return t;
  }

  apply(offset = 0) {
    this.ranges.forEach(range => {
      range.apply(offset);
    });
  }

  collapse(toEnd = false) {
    const range = toEnd ? this.lastRange : this.firstRange;
    range.collapse(toEnd);
    this._ranges = [range];
    this.apply();
  }

  getRangePaths(): Array<RangePath> {
    const getPaths = (fragment: Fragment): number[] => {
      const paths = [];
      while (fragment.parent) {
        paths.push(fragment.getIndexInParent());
        fragment = fragment.parent;
      }
      return paths.reverse();
    };
    return this.ranges.map<RangePath>(range => {
      const paths = getPaths(range.startFragment);
      paths.push(range.startIndex);
      if (range.collapsed) {
        return {
          startPaths: paths,
          endPaths: paths
        }
      } else {
        const endPaths = getPaths(range.endFragment);
        endPaths.push(range.endIndex);
        return {
          startPaths: paths,
          endPaths
        }
      }
    });
  }

  usePaths(paths: RangePath[], fragment: Fragment) {

    const findPosition = (position: number[], fragment: Fragment): TBRangePosition => {
      let f = fragment;
      let len = position.length;
      for (let i = 0; i < position.length; i++) {
        if (i === len - 1) {
          return {
            fragment: f,
            index: position[i]
          }
        } else {
          f = f.contents.getContentAtIndex(position[i]) as Fragment;
        }
      }
    };

    this.removeAllRanges();
    const selection = this.context.getSelection();
    selection.removeAllRanges();
    paths.filter(r => r.startPaths.length).forEach(rangePosition => {
      const start = findPosition(rangePosition.startPaths, fragment);
      const nativeRange = this.context.createRange();
      selection.addRange(nativeRange);
      const range = new TBRange(nativeRange);

      range.startIndex = start.index;
      range.startFragment = start.fragment;

      if (rangePosition.endPaths === rangePosition.startPaths) {
        range.endIndex = start.index;
        range.endFragment = start.fragment;
      } else {
        const end = findPosition(rangePosition.endPaths, fragment);
        range.endIndex = end.index;
        range.endFragment = end.fragment;
      }
      this.addRange(range);
    });

  }

  private getCommonFragment(): Fragment {
    const ranges = this.ranges || [];
    if (ranges.length === 1) {
      return ranges[0].commonAncestorFragment;
    }

    const depth: Fragment[][] = [];

    ranges.map(range => range.commonAncestorFragment).forEach(fragment => {
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
}
