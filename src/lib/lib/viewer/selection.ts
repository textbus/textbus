import { Fragment } from '../parser/fragment';
import { TBRange } from './range';

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

  removeAllRanges() {
    this._ranges = [];
  }

  addRange(range: TBRange) {
    this._ranges.push(range);
  }

  clone() {
    const t = new TBSelection();
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
