import { TBRange, TBRangePosition } from './range';

/**
 * 记录 Range 的位置 path
 */
export interface RangePath {
  startPaths: number[];
  endPaths: number[];
}

/**
 * TBus 定义的抽象 Selection 类
 */
export class TBSelection {
  /**
   * 获取所有 Range
   */
  get ranges(): TBRange[] {
    return this._ranges;
  };

  /**
   * 获取所有 Range 的公共 Fragment
   */
  get commonAncestorFragment() {
    return this.getCommonFragment();
  };

  /**
   * 获取 Range 的数量
   */
  get rangeCount() {
    return this.ranges.length;
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

  constructor(private context: Document) {
  }

  /**
   * 清除所有的 Range
   */
  removeAllRanges() {
    this._ranges = [];
  }

  /**
   * 添加 Range
   * @param range
   */
  addRange(range: TBRange) {
    this._ranges.push(range);
  }

  /**
   * 复制当前 Selection 的副本
   */
  clone() {
    const t = new TBSelection(this.context);
    t._ranges = this.ranges.map(r => r.clone());
    return t;
  }

  /**
   * 将当前选区应用到实际 DOM 中
   * @param offset 设置偏移量。如光标向后移一位为 1，光标向前移一位为 -1
   */
  apply(offset = 0) {
    this.ranges.forEach(range => {
      range.apply(offset);
    });
  }

  /**
   * 折叠当前选区
   * @param toEnd 是否折叠到结束位置
   */
  collapse(toEnd = false) {
    const range = toEnd ? this.lastRange : this.firstRange;
    range.collapse(toEnd);
    this._ranges = [range];
    this.apply();
  }

  // /**
  //  * 获取当前 Selection 所有 Range 的 path
  //  */
  // getRangePaths(): Array<RangePath> {
  //   const getPaths = (fragment: Fragment): number[] => {
  //     const paths = [];
  //     while (fragment.parent) {
  //       paths.push(fragment.getIndexInParent());
  //       fragment = fragment.parent;
  //     }
  //     return paths.reverse();
  //   };
  //   return this.ranges.map<RangePath>(range => {
  //     const paths = getPaths(range.startFragment);
  //     paths.push(range.startIndex);
  //     if (range.collapsed) {
  //       return {
  //         startPaths: paths,
  //         endPaths: paths
  //       }
  //     } else {
  //       const endPaths = getPaths(range.endFragment);
  //       endPaths.push(range.endIndex);
  //       return {
  //         startPaths: paths,
  //         endPaths
  //       }
  //     }
  //   });
  // }
  //
  // /**
  //  * 将一组路径应用到当前 Selection
  //  * @param paths
  //  * @param fragment
  //  */
  // usePaths(paths: RangePath[], fragment: Fragment) {
  //   const findPosition = (position: number[], fragment: Fragment): TBRangePosition => {
  //     let f = fragment;
  //     let len = position.length;
  //     for (let i = 0; i < position.length; i++) {
  //       if (i === len - 1) {
  //         return {
  //           fragment: f,
  //           index: position[i]
  //         }
  //       } else {
  //         f = f.getContentAtIndex(position[i]) as Fragment;
  //       }
  //     }
  //   };
  //
  //   this.removeAllRanges();
  //   const selection = this.context.getSelection();
  //   selection.removeAllRanges();
  //   paths.filter(r => r.startPaths.length).forEach(rangePosition => {
  //     const start = findPosition(rangePosition.startPaths, fragment);
  //     const nativeRange = this.context.createRange();
  //     selection.addRange(nativeRange);
  //     const range = new TBRange(nativeRange);
  //
  //     range.startIndex = start.index;
  //     range.startFragment = start.fragment;
  //
  //     if (rangePosition.endPaths === rangePosition.startPaths) {
  //       range.endIndex = start.index;
  //       range.endFragment = start.fragment;
  //     } else {
  //       const end = findPosition(rangePosition.endPaths, fragment);
  //       range.endIndex = end.index;
  //       range.endFragment = end.fragment;
  //     }
  //     this.addRange(range);
  //   });
  //
  // }
  //
  // private getCommonFragment(): Fragment {
  //   const ranges = this.ranges || [];
  //   if (ranges.length === 1) {
  //     return ranges[0].commonAncestorFragment;
  //   }
  //
  //   const depth: Fragment[][] = [];
  //
  //   ranges.map(range => range.commonAncestorFragment).forEach(fragment => {
  //     const tree = [];
  //     while (fragment) {
  //       tree.push(fragment);
  //       fragment = fragment.parent;
  //     }
  //     depth.push(tree);
  //   });
  //
  //   let fragment: Fragment = null;
  //
  //   while (true) {
  //     const firstFragments = depth.map(arr => arr.pop()).filter(i => i);
  //     if (firstFragments.length === depth.length) {
  //       if (new Set(firstFragments).size === 1) {
  //         fragment = firstFragments[0];
  //       } else {
  //         break;
  //       }
  //     }
  //   }
  //   return fragment;
  // }
}
