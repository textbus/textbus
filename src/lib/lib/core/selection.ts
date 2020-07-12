import { TBRange, TBRangePosition } from './range';
import { Renderer } from './renderer';
import { Fragment } from './fragment';
import { BackboneComponent, BranchComponent } from './component';

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
    return this.ranges.length === 1 && this.firstRange.collapsed || this.ranges.length === 0;
  }

  private _ranges: TBRange[] = [];
  private nativeSelection: Selection;

  constructor(private context: Document, private renderer: Renderer) {
    this.nativeSelection = context.getSelection();
    for (let i = 0; i < this.nativeSelection.rangeCount; i++) {
      this._ranges.push(new TBRange(this.nativeSelection.getRangeAt(i), this.renderer));
    }
  }

  restore() {
    this._ranges.forEach(range => {
      range.restore();
    });
  }

  /**
   * 清除所有的 Range
   */
  removeAllRanges() {
    this._ranges = [];
  }

  addRange(range: TBRange) {
    this._ranges.push(range);
  }

  /**
   * 获取当前 Selection 所有 Range 的 path
   */
  getRangePaths(): Array<RangePath> {
    const getPaths = (fragment: Fragment): number[] => {
      const paths = [];
      while (fragment) {
        const parentTemplate = this.renderer.getParentTemplate(fragment);
        if (parentTemplate) {
          parentTemplate instanceof BackboneComponent ? paths.push(parentTemplate.childSlots.indexOf(fragment)) : paths.push(0);
          fragment = this.renderer.getParentFragment(parentTemplate);
          paths.push(fragment.indexOf(parentTemplate));
        } else {
          break;
        }
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

  /**
   * 将一组路径应用到当前 Selection
   * @param paths
   * @param fragment
   */
  usePaths(paths: RangePath[], fragment: Fragment) {
    const findPosition = (position: number[], fragment: Fragment): TBRangePosition => {
      const paths = position.map(i => i).reverse();
      while (true) {
        const index = paths.pop();
        const c = fragment.getContentAtIndex(index);
        const last = paths.pop();
        if (c instanceof BranchComponent && last === 0) {
          fragment = c.slot;
        } else if (c instanceof BackboneComponent) {
          fragment = c.childSlots[last];
        } else {
          throw new Error('未找到历史位置')
        }
        if (paths.length === 1) {
          return {
            fragment,
            index: paths.pop()
          }
        }
      }
    };
    this.removeAllRanges();
    paths.filter(r => r.startPaths.length).forEach(rangePosition => {
      const start = findPosition(rangePosition.startPaths, fragment);
      const nativeRange = this.context.createRange();
      const range = new TBRange(nativeRange, this.renderer);

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
      this.nativeSelection.addRange(nativeRange);
      this.addRange(range);
    });
  }

  /**
   * 复制当前 Selection 的副本
   */
  clone() {
    const t = new TBSelection(this.context, this.renderer);
    t._ranges = this.ranges.map(r => r.clone());
    return t;
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
        fragment = this.renderer.getParentFragment(this.renderer.getParentTemplate(fragment));
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
