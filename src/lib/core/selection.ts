import { TBRange, TBRangePosition } from './range';
import { Renderer } from './renderer';
import { Fragment } from './fragment';
import { BackboneComponent, BranchComponent, DivisionComponent } from './component';

/**
 * 记录选区路径数据。
 */
export interface RangePath {
  startPaths: number[];
  endPaths: number[];
}

/**
 * TextBus 选区对象
 */
export class TBSelection {
  /**
   * 选区范围个数。
   */
  get rangeCount() {
    return this._ranges.length;
  }

  /**
   * 所有选区范围集合。
   */
  get ranges() {
    return this._ranges;
  }

  /**
   * 所有选区的所属最近的公共 fragment。
   */
  get commonAncestorFragment() {
    return this.getCommonFragment();
  }

  /**
   * 获取 Selection 的第一个 Range。
   */
  get firstRange() {
    return this.ranges[0] || null;
  }

  /**
   * 获取 Selection 的最后一个 Range。
   */
  get lastRange() {
    return this.ranges[this.ranges.length - 1] || null;
  }

  /**
   * 当前 Selection 是否折叠。
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

  /**
   * 通过 TBRange 复位原生选区。
   */
  restore() {
    this._ranges.forEach(range => {
      range.restore();
    });
  }

  /**
   * 清除所有的 Range。
   * @param syncNative
   */
  removeAllRanges(syncNative = false) {
    if (syncNative) {
      this.nativeSelection.removeAllRanges();
    }
    this._ranges = [];
  }

  /**
   * 添加一个 Range。
   * @param range
   * @param syncNative
   */
  addRange(range: TBRange, syncNative = false) {
    this.nativeSelection.addRange(range.nativeRange)
    this._ranges.push(range);
  }

  /**
   * 创建一个新的区域
   */
  createRange() {
    return new TBRange(this.context.createRange(), this.renderer);
  }

  /**
   * 获取当前 Selection 所有 Range 的 path
   */
  getRangePaths(): Array<RangePath> {
    const getPaths = (fragment: Fragment): number[] => {
      const paths = [];
      while (fragment) {
        const parentComponent = fragment.parentComponent;
        if (parentComponent) {
          if (parentComponent instanceof BranchComponent) {
            paths.push(parentComponent.slots.indexOf(fragment))
          } else if (parentComponent instanceof BackboneComponent) {
            paths.push(parentComponent.indexOf(fragment));
          } else {
            paths.push(0);
          }
          fragment = parentComponent.parentFragment;
          paths.push(fragment.indexOf(parentComponent));
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
        if (c instanceof DivisionComponent && last === 0) {
          fragment = c.slot;
        } else if (c instanceof BranchComponent) {
          fragment = c.getSlotAtIndex(last);
        } else if (c instanceof BackboneComponent) {
          fragment = c.getSlotAtIndex(last);
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
    this.nativeSelection.removeAllRanges();

    const len = paths.length;
    if (len === 0) {
      return;
    }

    const startPaths = paths[0].startPaths;
    const endPaths = paths[len - 1].endPaths;
    const start = findPosition(startPaths, fragment);
    const nativeRange = this.context.createRange();
    const range = new TBRange(nativeRange, this.renderer);

    range.startIndex = start.index;
    range.startFragment = start.fragment;

    if (endPaths === startPaths) {
      range.endIndex = start.index;
      range.endFragment = start.fragment;
    } else {
      const end = findPosition(endPaths, fragment);
      range.endIndex = end.index;
      range.endFragment = end.fragment;
    }
    this.nativeSelection.addRange(nativeRange);
    this.addRange(range);
  }

  /**
   * 克隆当前 Selection 的副本，并返回。
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
        fragment = fragment.parentComponent.parentFragment;
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
