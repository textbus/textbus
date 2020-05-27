import { TBRange } from './range';
import { Renderer } from './renderer';
import { Fragment } from './fragment';

export interface RangePath {
  startPaths: number[];
  endPaths: number[];
}

export class TBSelection {
  get rangeCount() {
    return this._ranges.length;
  }

  get ranges() {
    return this._ranges;
  }

  get commonAncestorFragment() {
    return this.getCommonFragment();
  }

  /**
   * 获取 Selection 的第一个 Range
   */
  get firstRange() {
    return this.ranges[0] || null;
  }

  /**
   * 获取 Selection 的最后一个 Range
   */
  get lastRange() {
    return this.ranges[this.ranges.length - 1] || null;
  }

  /**
   * 当前 Selection 是否折叠
   */
  get collapsed() {
    return this.ranges.length === 1 && this.firstRange.collapsed;
  }

  private _ranges: TBRange[] = [];

  constructor(private nativeSelection: Selection, private renderer: Renderer) {
    for (let i = 0; i < this.nativeSelection.rangeCount; i++) {
      this._ranges.push(new TBRange(this.nativeSelection.getRangeAt(i), this.renderer));
    }
  }

  restore() {
    this._ranges.forEach(range => {
      range.restore();
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
        fragment = this.renderer.getParentFragmentByTemplate(this.renderer.getParentTemplateByFragment(fragment));
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
