import { Type } from '@tanbo/di';

import { ElementPosition, Renderer } from './renderer';
import { Fragment } from './fragment';
import { VElement, VTextNode } from './element';
import {
  BranchAbstractComponent,
  LeafAbstractComponent,
  DivisionAbstractComponent,
  AbstractComponent,
  BackboneAbstractComponent
} from './component';
import { BlockFormatter } from './formatter';
import { BrComponent } from '../components/br.component';

/**
 * 标识 Fragment 中的一个位置。
 */
export interface TBRangePosition {
  fragment: Fragment;
  index: number;
}

/**
 * 标识一个选中 Fragment 的范围。
 */
export interface TBRangeScope {
  startIndex: number;
  endIndex: number;
  fragment: Fragment;
}

/**
 * TextBus 中的选区范围类，可操作基于 Fragment 和 Component 的范围，并提供了一系列的扩展方法供编辑富文本内容使用。
 */
export class TBRange {
  /** 选区范围开始位置 */
  startIndex: number;
  /** 选区范围结束位置 */
  endIndex: number;
  /** 开始选区范围 */
  startFragment: Fragment;
  /** 结束选区范围 */
  endFragment: Fragment;

  /**
   * 当前选区范围最近的公共 Fragment。
   */
  get commonAncestorFragment() {
    return this.getCommonAncestorFragment();
  }

  /**
   * 当前选区范围最近的公共组件。
   */
  get commonAncestorComponent() {
    return this.getCommonAncestorComponent();
  }

  /**
   * 当前所选范围是否折叠。
   */
  get collapsed() {
    return this.startFragment === this.commonAncestorFragment &&
      this.endFragment === this.commonAncestorFragment &&
      this.startIndex === this.endIndex;
  }

  constructor(public nativeRange: Range,
              private renderer: Renderer) {
    const startPosition = renderer.getPositionByNode(nativeRange.startContainer);
    const endPosition = renderer.getPositionByNode(nativeRange.endContainer);
    if ([Node.ELEMENT_NODE, Node.TEXT_NODE].includes(nativeRange.commonAncestorContainer?.nodeType) &&
      startPosition && endPosition) {
      const start = TBRange.findPosition(nativeRange.startContainer, nativeRange.startOffset, startPosition, renderer);
      this.startFragment = start.fragment;
      this.startIndex = start.index
      const end = TBRange.findPosition(nativeRange.endContainer, nativeRange.endOffset, endPosition, renderer);
      this.endFragment = end.fragment;
      this.endIndex = end.index;
    }
  }

  /**
   * 克隆一个完全一样的副本并返回。
   */
  clone() {
    const r = new TBRange(this.nativeRange.cloneRange(), this.renderer);
    Object.assign(r, this);
    return r;
  }

  /**
   * 根据当前的 startFragment 和 startIndex，endFragment 和 endIndex，设置在浏览器的的选区范围。
   */
  restore() {
    if (this.startFragment.dirty || this.endFragment.dirty) {
      console.info('渲染延迟！');
      return this;
    }
    const start = this.findFocusNodeAndOffset(this.startFragment, this.startIndex);
    const end = this.findFocusNodeAndOffset(this.endFragment, this.endIndex);
    if (start && end) {
      this.nativeRange.setStart(start.node, start.offset);
      this.nativeRange.setEnd(end.node, end.offset);
    } else {
      console.warn('未找到焦点元素')
    }
    return this;
  }

  /**
   * 设置选区范围开始的位置。
   * @param fragment 开始的片段
   * @param offset 开始的偏移位置，从 0 开始计算。
   */
  setStart(fragment: Fragment, offset: number) {
    this.startFragment = fragment;
    this.startIndex = offset;
  }

  /**
   * 设置选区范围结束的位置。
   * @param fragment 结束的片段
   * @param offset 线束的偏移位置，从 0 开始计算。
   */
  setEnd(fragment: Fragment, offset: number) {
    this.endFragment = fragment;
    this.endIndex = offset;
  }

  /**
   * 获取当前选区在公共 Fragment 中的范围。
   */
  getCommonAncestorFragmentScope() {
    let startFragment = this.startFragment;
    let endFragment = this.endFragment;
    let startIndex = this.startIndex;
    let endIndex = this.endIndex;
    const commonAncestorFragment = this.commonAncestorFragment;

    let startChildComponent: BranchAbstractComponent | DivisionAbstractComponent | BackboneAbstractComponent = null;
    let endChildComponent: BranchAbstractComponent | DivisionAbstractComponent | BackboneAbstractComponent = null;

    while (startFragment !== commonAncestorFragment) {
      startChildComponent = startFragment.parentComponent;
      startFragment = startChildComponent.parentFragment;
      startIndex = startFragment.indexOf(startChildComponent);
    }

    while (endFragment !== commonAncestorFragment) {
      endChildComponent = endFragment.parentComponent;
      endFragment = endChildComponent.parentFragment;
      endIndex = endFragment.indexOf(endChildComponent);
    }

    return {
      startIndex,
      startFragment,
      startChildComponent,
      endIndex: endIndex + 1,
      endFragment,
      endChildComponent
    }
  }

  /**
   * 获取当前选区范围在 T 插槽的范围。
   * @param of 子类的构造 class。
   * @param filter 可选的过滤条件，可根据实例判断是否为想要找的 T 实例。
   */
  getSlotRange<T extends BranchAbstractComponent | BackboneAbstractComponent>(of: Type<T>, filter?: (instance: T) => boolean): Array<{ component: T; startIndex: number; endIndex: number }> {
    const maps: Array<{ component: T, index: number }> = [];
    this.getSelectedScope().forEach(scope => {
      const context = scope.fragment.getContext(of, filter);
      let fragment: Fragment = scope.fragment;
      while (fragment) {
        const parentComponent = fragment.parentComponent;
        if (parentComponent === context) {
          maps.push({
            component: context,
            index: context instanceof BackboneAbstractComponent ?
              context.indexOf(fragment) :
              (context as BranchAbstractComponent).slots.indexOf(fragment)
          })
          break;
        }
        fragment = parentComponent.parentFragment;
      }
    });
    const components: T[] = [];
    const rangeMark = new Map<T, { startIndex: number; endIndex: number }>();
    maps.forEach(item => {
      if (!components.includes(item.component)) {
        components.push(item.component);
        rangeMark.set(item.component, {startIndex: item.index, endIndex: item.index + 1})
      } else {
        rangeMark.get(item.component).endIndex = item.index + 1;
      }
    });

    return components.map(t => {
      return {
        component: t,
        ...rangeMark.get(t)
      }
    });
  }

  /**
   * 获取当前选区选中的所有片段
   * 如（[]表示选区位置)：
   * <Fragment>
   *   <Inline>00[00</Inline>
   *   <ChildFragmentA>11111</ChildFragmentA>
   *   <ChildFragmentB>222]22</ChildFragmentB>
   * </Fragment>
   * 则返回：
   * [{
   *   fragment: Fragment,
   *   startIndex: 2,
   *   endIndex: 4,
   * }, {
   *   fragment: ChildFragmentA,
   *   startIndex: 0,
   *   endIndex: 5
   * }, {
   *   fragment: ChildFragmentB,
   *   startIndex: 0,
   *   endIndex: 3
   * }]
   */
  getSelectedScope(): TBRangeScope[] {
    if (this.collapsed) {
      return [{
        fragment: this.commonAncestorFragment,
        startIndex: this.startIndex,
        endIndex: this.endIndex
      }];
    }
    return this.getScopes(this.startFragment, this.endFragment, this.startIndex, this.endIndex);
  }

  /**
   * 获取选区内扩展后的的 Inline
   * 如（[]表示选区位置)：
   * <Fragment>
   *   <Inline>00[00</Inline>
   *   <ChildFragmentA>11111</ChildFragmentA>
   *   <ChildFragmentB>222]22</ChildFragmentB>
   * </Fragment>
   * 则返回：
   * [{
   *   fragment: Fragment,
   *   startIndex: 0,
   *   endIndex: 4,
   * }, {
   *   fragment: ChildFragmentA,
   *   startIndex: 0,
   *   endIndex: 5
   * }, {
   *   fragment: ChildFragmentB,
   *   startIndex: 0,
   *   endIndex: 5
   * }]
   */

  getExpandedScope(): TBRangeScope[] {
    return this.getScopes(this.startFragment,
      this.endFragment,
      TBRange.findExpandedStartIndex(this.startFragment, this.startIndex),
      TBRange.findExpandedEndIndex(this.endFragment, this.endIndex));
  }

  /**
   * 获取选区内所有连续的 Inline
   * 如（[]表示选区位置)：
   * <Fragment>
   *   <Inline>00[00</Inline>
   *   <ChildFragmentA>11111</ChildFragmentA>
   *   <ChildFragmentB>222]22</ChildFragmentB>
   * </Fragment>
   * 则返回：
   * [{
   *   fragment: Fragment,
   *   startIndex: 0,
   *   endIndex: 4,
   * }, {
   *   fragment: ChildFragmentA,
   *   startIndex: 0,
   *   endIndex: 5
   * }, {
   *   fragment: ChildFragmentB,
   *   startIndex: 0,
   *   endIndex: 5
   * }]
   */
  getSuccessiveContents() {
    function fn(fragment: Fragment, startIndex: number, endIndex: number) {
      const scopes: TBRangeScope[] = [];
      if (startIndex >= endIndex) {
        return scopes;
      }
      let newScope: TBRangeScope;

      let i = 0;
      const contents = fragment.sliceContents(startIndex, endIndex);
      contents.forEach(c => {
        if (c instanceof DivisionAbstractComponent) {
          newScope = null;
          scopes.push(...fn(c.slot, 0, c.slot.contentLength));
        } else if (c instanceof BranchAbstractComponent) {
          newScope = null;
          c.slots.forEach(childFragment => {
            scopes.push(...fn(childFragment, 0, childFragment.contentLength));
          })
        } else if (c instanceof BackboneAbstractComponent) {
          newScope = null;
          for (const childFragment of c) {
            scopes.push(...fn(childFragment, 0, childFragment.contentLength));
          }
        } else {
          if (!newScope) {
            newScope = {
              startIndex: startIndex + i,
              endIndex: startIndex + i + c.length,
              fragment
            };
            scopes.push(newScope);
          } else {
            newScope.endIndex = startIndex + i + c.length;
          }
        }
        i += c.length;
      });
      return scopes;
    }

    const result: TBRangeScope[] = [];
    this.getExpandedScope().forEach(scope => {
      result.push(...fn(scope.fragment, scope.startIndex, scope.endIndex));
    });
    return result;
  }

  /**
   * 删除选区范围内容，并合并选区范围。
   */
  connect() {
    if (this.collapsed) {
      return;
    }
    const startFragment = this.startFragment;
    if (startFragment === this.endFragment) {
      startFragment.remove(this.startIndex, this.endIndex);
    } else {
      let isDeleteFragment = false;
      const endFragmentIsCommon = this.endFragment === this.commonAncestorFragment;
      const scopeStartIndex = this.getCommonAncestorFragmentScope().startIndex;
      if (this.startIndex === 0) {
        const {fragment, index} = this.findFirstPosition(startFragment);
        isDeleteFragment = fragment === startFragment && index === this.startIndex;
      }

      this.deleteSelectedScope();
      if (isDeleteFragment && startFragment === this.startFragment) {
        const c = endFragmentIsCommon ? this.endFragment.cut(this.endIndex) : this.endFragment;
        this.startFragment.contact(c);
        const firstPosition = this.findFirstPosition(this.startFragment);
        this.setStart(firstPosition.fragment, firstPosition.index);
        if (!endFragmentIsCommon) {
          this.deleteEmptyTree(this.endFragment);
        }
      } else {
        if (this.startFragment !== this.endFragment) {
          if (endFragmentIsCommon) {
            const lastContents = this.endFragment.sliceContents(scopeStartIndex + 1);
            let count = 0;
            while (lastContents.length) {
              const first = lastContents.shift();
              if (first instanceof LeafAbstractComponent || typeof first === 'string') {
                this.startFragment.append(first);
                count += first.length;
              } else {
                break;
              }
            }

            this.endFragment.remove(scopeStartIndex + 1, count);
          } else {
            const endLast = this.endFragment.cut(0);
            this.deleteEmptyTree(this.endFragment);
            const startLast = this.startFragment.cut(this.startIndex);

            this.startFragment.contact(endLast);
            this.startFragment.contact(startLast);
          }
        }
      }
    }

    this.collapse();
  }

  /**
   * 删除选区范围内的内容。
   * 注意：
   * 此方法并不会合并选区。如果要删除内容，且要合并选区，请调用 connect 方法。
   */
  deleteSelectedScope() {
    this.getSelectedScope().reverse().forEach(scope => {
      if (scope.startIndex === 0 && scope.endIndex === scope.fragment.contentLength) {
        const parentComponent = scope.fragment.parentComponent;
        scope.fragment.remove(0);
        if (parentComponent instanceof BackboneAbstractComponent) {
          if (parentComponent.canDelete(scope.fragment)) {
            let position = this.getPreviousPosition();
            const parentFragment = parentComponent.parentFragment;
            const index = parentFragment.indexOf(parentComponent);
            parentFragment.remove(index, 1);

            if (parentFragment.contentLength === 0) {
              this.deleteEmptyTree(parentFragment);
            }

            if (position.fragment === this.startFragment) {
              const nextContent = parentFragment.getContentAtIndex(index);
              if (nextContent instanceof DivisionAbstractComponent) {
                position = this.findFirstPosition(nextContent.slot);
              } else if (nextContent instanceof BranchAbstractComponent) {
                if (nextContent.slots[0]) {
                  position = this.findFirstPosition(nextContent.slots[0]);
                }
              } else {
                position = {
                  fragment: parentFragment,
                  index
                };
              }
            }
            this.setStart(position.fragment, position.index);
          }
        } else if (scope.fragment !== this.startFragment && scope.fragment !== this.endFragment) {
          this.deleteEmptyTree(scope.fragment);
        }
      } else {
        scope.fragment.cut(scope.startIndex, scope.endIndex - scope.startIndex);
      }
    });
    return this;
  }

  /**
   * 根据 Fragment 依次向上查找，如果 Fragment 为空或 Component 为空，则删除。
   * 直到根 Fragment 或当前 Fragment 等于 endFragment。
   * @param fragment 开始删除的 fragment。
   * @param endFragment 可选的结束的 fragment，如不传，则依次向上查找，直到根 fragment。
   * @return 删除内容后不为空的 component 或 fragment。
   */
  deleteEmptyTree(fragment: Fragment, endFragment?: Fragment): BranchAbstractComponent | BackboneAbstractComponent | Fragment {
    if (fragment === endFragment) {
      return fragment;
    }
    const parentComponent = fragment.parentComponent;
    if (!parentComponent.parentFragment) {
      return fragment;
    }
    if (parentComponent instanceof DivisionAbstractComponent) {
      const parentFragment = parentComponent.parentFragment;
      parentFragment.cut(parentFragment.indexOf(parentComponent), 1);
      if (parentFragment.contentLength === 0) {
        return this.deleteEmptyTree(parentFragment, endFragment);
      }
      return parentFragment;
    } else if (parentComponent instanceof BranchAbstractComponent) {
      parentComponent.slots.splice(parentComponent.slots.indexOf(fragment), 1);
      if (parentComponent.slots.length === 0) {
        const parentFragment = parentComponent.parentFragment;
        const index = parentFragment.indexOf(parentComponent);
        parentFragment.cut(index, 1);
        if (parentFragment.contentLength === 0) {
          return this.deleteEmptyTree(parentFragment, endFragment);
        }
        return parentFragment;
      }
      return parentComponent;
    } else if (parentComponent instanceof BackboneAbstractComponent) {
      fragment.clean();
      const b = parentComponent.canDelete(fragment);
      if (b) {
        const parentFragment = parentComponent.parentFragment;
        const index = parentFragment.indexOf(parentComponent);
        parentFragment.cut(index, 1);
        if (parentFragment.contentLength === 0) {
          return this.deleteEmptyTree(parentFragment, endFragment);
        }
        return parentFragment;
      }
      return parentComponent;
    }
    return fragment;
  }

  /**
   * 折叠当前选区
   * @param toEnd 是否折叠到结束位置
   */
  collapse(toEnd = false) {
    if (toEnd) {
      this.startIndex = this.endIndex;
      this.startFragment = this.endFragment;
    } else {
      this.endFragment = this.startFragment;
      this.endIndex = this.startIndex;
    }
    return this;
  }

  /**
   * 获取上一个选区位置。
   */
  getPreviousPosition(): TBRangePosition {
    let fragment = this.startFragment;

    if (this.startIndex > 0) {
      const prev = fragment.getContentAtIndex(this.startIndex - 1);
      if (prev instanceof DivisionAbstractComponent) {
        return this.findLastChild(prev.slot);
      }
      if (prev instanceof BranchAbstractComponent) {
        return this.findLastChild(prev.slots[prev.slots.length - 1]);
      }
      if (prev instanceof BackboneAbstractComponent) {
        return this.findLastChild(prev.getSlotAtIndex(prev.slotCount - 1));
      }
      return {
        fragment,
        index: this.startIndex - 1
      }
    }

    // 循环向前找第一个子 fragment，但有可能当前这个就是第一个，这时循环
    // 向上会找不到，那么就使用当前的 fragment
    const cacheFragment = fragment;

    while (true) {
      const parentComponent = fragment.parentComponent;
      if (parentComponent instanceof BranchAbstractComponent) {
        const fragmentIndex = parentComponent.slots.indexOf(fragment);
        if (fragmentIndex > 0) {
          return this.findLastChild(parentComponent.slots[fragmentIndex - 1]);
        }
      }

      if (parentComponent instanceof BackboneAbstractComponent) {
        const fragmentIndex = parentComponent.indexOf(fragment);
        if (fragmentIndex > 0) {
          return this.findLastChild(parentComponent.getSlotAtIndex(fragmentIndex - 1));
        }
      }

      const parentFragment = parentComponent.parentFragment;

      if (!parentFragment) {
        return {
          fragment: cacheFragment,
          index: 0
        };
      }
      const componentIndex = parentFragment.indexOf(parentComponent);
      if (componentIndex > 0) {
        const prevContent = parentFragment.getContentAtIndex(componentIndex - 1);
        if (prevContent instanceof DivisionAbstractComponent) {
          return this.findLastChild(prevContent.slot);
        }
        if (prevContent instanceof BranchAbstractComponent) {
          return this.findLastChild(prevContent.slots[prevContent.slots.length - 1]);
        }
        if (prevContent instanceof BackboneAbstractComponent) {
          return this.findLastChild(prevContent.getSlotAtIndex(prevContent.slotCount - 1));
        }
        return {
          fragment: parentFragment,
          index: prevContent instanceof LeafAbstractComponent ? componentIndex - 1 : componentIndex
        }
      } else {
        fragment = parentFragment;
      }
    }
  }

  /**
   * 获取下一个选区位置。
   */
  getNextPosition(): TBRangePosition {
    let fragment = this.endFragment;
    let offset = this.endIndex;
    if (offset === fragment.contentLength - 1) {
      const current = fragment.getContentAtIndex(offset);
      if (current instanceof BrComponent) {
        offset++;
      }
    }
    if (offset < fragment.contentLength) {
      let current = fragment.getContentAtIndex(offset);

      if (current instanceof LeafAbstractComponent) {
        current = fragment.getContentAtIndex(offset + 1);
      }
      if (current instanceof DivisionAbstractComponent) {
        return this.findFirstPosition(current.slot);
      }
      if (current instanceof BranchAbstractComponent) {
        return this.findFirstPosition(current.slots[0]);
      }
      if (current instanceof BackboneAbstractComponent) {
        return this.findFirstPosition(current.getSlotAtIndex(0));
      }
      return {
        fragment,
        index: offset + 1
      }
    }

    // 循环向后找最后一个子 fragment，但有可能当前这个就是最后一个，这时循环
    // 向上会找不到，那么就使用当前的 fragment
    const cacheFragment = fragment;

    while (true) {
      const parentComponent = fragment.parentComponent;
      if (!parentComponent) {
        const len = cacheFragment.contentLength;
        const last = cacheFragment.getContentAtIndex(len - 1);
        return {
          fragment: cacheFragment,
          index: last instanceof BrComponent ? len - 1 : len
        }
      }
      if (parentComponent instanceof BranchAbstractComponent) {
        const fragmentIndex = parentComponent.slots.indexOf(fragment);
        if (fragmentIndex < parentComponent.slots.length - 1) {
          return this.findFirstPosition(parentComponent.slots[fragmentIndex + 1]);
        }
      }
      if (parentComponent instanceof BackboneAbstractComponent) {
        const fragmentIndex = parentComponent.indexOf(fragment);
        if (fragmentIndex < parentComponent.slotCount - 1) {
          return this.findFirstPosition(parentComponent.getSlotAtIndex(fragmentIndex + 1));
        }
      }
      const parentFragment = parentComponent.parentFragment;
      if (!parentFragment) {
        const len = cacheFragment.contentLength;
        const last = cacheFragment.getContentAtIndex(len - 1);
        return {
          fragment: cacheFragment,
          index: last instanceof BrComponent ? len - 1 : len
        }
      }
      const componentIndex = parentFragment.indexOf(parentComponent);
      if (componentIndex < parentFragment.contentLength - 1) {
        const nextContent = parentFragment.getContentAtIndex(componentIndex + 1);
        if (nextContent instanceof DivisionAbstractComponent) {
          return this.findFirstPosition(nextContent.slot);
        }
        if (nextContent instanceof BranchAbstractComponent) {
          return this.findFirstPosition(nextContent.slots[0]);
        }
        if (nextContent instanceof BackboneAbstractComponent) {
          return this.findFirstPosition(nextContent.getSlotAtIndex(0));
        }
        return {
          fragment: parentFragment,
          index: componentIndex + 1
        }
      } else {
        fragment = parentFragment;
      }
    }
  }

  /**
   * 获取选区向上移动一行的位置。
   * @param startLeft 参考位置。
   */
  getPreviousLinePosition(startLeft: number): TBRangePosition {
    const range2 = this.clone();
    let isToPrevLine = false;
    let loopCount = 0;
    let minLeft = startLeft;
    let minTop = this.getRangePosition().top;
    let position: TBRangePosition;
    let oldPosition: TBRangePosition;
    let oldLeft = 0;
    while (true) {
      loopCount++;
      position = range2.getPreviousPosition();
      range2.startIndex = range2.endIndex = position.index;
      range2.startFragment = range2.endFragment = position.fragment;
      range2.restore();
      const rect2 = range2.getRangePosition();
      if (!isToPrevLine) {
        if (rect2.left > minLeft || rect2.top < minTop) {
          isToPrevLine = true;
        } else if (rect2.left === minLeft && rect2.top === minTop) {
          return position;
        }
        minLeft = rect2.left;
        minTop = rect2.top;
      }
      if (isToPrevLine) {
        if (rect2.left < startLeft) {
          return position;
        }
        if (oldPosition) {
          if (rect2.left >= oldLeft) {
            return oldPosition;
          }
        }
        oldLeft = rect2.left;
        oldPosition = position;
      }
      if (loopCount > 10000) {
        break;
      }
    }
    return position || {
      index: 0,
      fragment: this.startFragment
    };
  }

  /**
   * 获取选区向下移动一行的位置。
   * @param startLeft 参考位置。
   */
  getNextLinePosition(startLeft: number): TBRangePosition {
    const range2 = this.clone();
    let isToNextLine = false;
    let loopCount = 0;
    let maxRight = startLeft;
    let minTop = this.getRangePosition().top;
    let oldPosition: TBRangePosition;
    let oldLeft = 0;
    while (true) {
      loopCount++;
      const position = range2.getNextPosition();
      range2.startIndex = range2.endIndex = position.index;
      range2.startFragment = range2.endFragment = position.fragment;
      range2.restore();
      const rect2 = range2.getRangePosition();
      if (!isToNextLine) {
        if (rect2.left < maxRight || rect2.top > minTop) {
          isToNextLine = true;
        } else if (rect2.left === maxRight && rect2.top === minTop) {
          return position;
        }
        maxRight = rect2.left;
        minTop = rect2.top;
        oldPosition = position;
      }
      if (isToNextLine) {
        if (rect2.left > startLeft) {
          return oldPosition;
        }
        if (oldPosition) {
          if (rect2.left <= oldLeft) {
            return oldPosition;
          }
        }
        oldPosition = position;
        oldLeft = rect2.left;
      }
      if (loopCount > 10000) {
        break;
      }
    }
    return oldPosition || {
      index: this.endFragment.contentLength,
      fragment: this.endFragment
    };
  }

  /**
   * 查找一个 fragment 下的第一个可以放置光标的位置。
   * @param fragment
   */
  findFirstPosition(fragment: Fragment): TBRangePosition {
    const first = fragment.getContentAtIndex(0);
    if (first instanceof DivisionAbstractComponent) {
      return this.findFirstPosition(first.slot);
    }
    if (first instanceof BranchAbstractComponent) {
      const firstFragment = first.slots[0];
      return this.findFirstPosition(firstFragment);
    }

    if (first instanceof BackboneAbstractComponent) {
      const firstFragment = first.getSlotAtIndex(0);
      return this.findFirstPosition(firstFragment);
    }
    return {
      index: 0,
      fragment
    };
  }

  findLastPosition(fragment: Fragment): TBRangePosition {
    const last = fragment.getContentAtIndex(fragment.contentLength - 1);
    if (last instanceof DivisionAbstractComponent) {
      return this.findLastPosition(last.slot);
    }
    if (last instanceof BranchAbstractComponent) {
      const firstFragment = last.slots[last.slots.length - 1];
      return this.findLastPosition(firstFragment);
    }

    if (last instanceof BackboneAbstractComponent) {
      const firstFragment = last.getSlotAtIndex(last.slotCount - 1);
      return this.findLastPosition(firstFragment);
    }

    if (last instanceof BrComponent) {
      return {
        index: fragment.contentLength - 1,
        fragment
      }
    }
    return {
      index: fragment.contentLength,
      fragment
    };
  }

  /**
   * 查找一个 fragment 下的最后一个可以放置光标的位置。
   * @param fragment
   */
  findLastChild(fragment: Fragment): TBRangePosition {
    const last = fragment.getContentAtIndex(fragment.contentLength - 1);
    if (last instanceof DivisionAbstractComponent) {
      return this.findLastChild(last.slot);
    }
    if (last instanceof BranchAbstractComponent) {
      const lastFragment = last.slots[last.slots.length - 1];
      return this.findLastChild(lastFragment);
    }
    if (last instanceof BackboneAbstractComponent) {
      const lastFragment = last.getSlotAtIndex(last.slotCount - 1);
      return this.findLastChild(lastFragment);
    }
    return {
      index: last instanceof BrComponent ?
        fragment.contentLength - 1 :
        fragment.contentLength,
      fragment
    }
  }

  /**
   * 获取选区范围在文档中的坐标位置。
   */
  getRangePosition() {
    const range: Range = this.nativeRange;
    let rect = range.getBoundingClientRect();
    const {startContainer, startOffset} = range;
    const offsetNode = startContainer.childNodes[startOffset];
    if (startContainer.nodeType === Node.ELEMENT_NODE) {
      if (offsetNode) {
        const p = this.renderer.getPositionByNode(offsetNode);
        if (p.endIndex - p.startIndex === 1 && p.fragment.getContentAtIndex(p.startIndex) instanceof LeafAbstractComponent) {
          rect = (offsetNode as HTMLElement).getBoundingClientRect();
        } else if (offsetNode.nodeType === Node.ELEMENT_NODE && offsetNode.childNodes.length === 0) {
          const cloneRange = range.cloneRange();
          const textNode = offsetNode.ownerDocument.createTextNode('\u200b');
          offsetNode.appendChild(textNode);
          cloneRange.selectNodeContents(offsetNode);
          rect = cloneRange.getBoundingClientRect();
          cloneRange.detach();
        }
      } else {
        const span = startContainer.ownerDocument.createElement('span');
        span.innerText = 'x';
        span.style.display = 'inline-block';
        startContainer.appendChild(span);
        rect = span.getBoundingClientRect();
        startContainer.removeChild(span);
      }
    }
    return rect;
  }

  private getScopes(startFragment: Fragment,
                    endFragment: Fragment,
                    startIndex: number,
                    endIndex: number): TBRangeScope[] {
    const start: TBRangeScope[] = [];
    const end: TBRangeScope[] = [];
    let startParentComponent: BranchAbstractComponent | DivisionAbstractComponent | BackboneAbstractComponent = null;
    let endParentComponent: BranchAbstractComponent | DivisionAbstractComponent | BackboneAbstractComponent = null;

    let startFragmentPosition: number = null;
    let endFragmentPosition: number = null;

    const commonAncestorComponent = this.commonAncestorComponent;

    while (startFragment !== this.commonAncestorFragment) {
      if (commonAncestorComponent && startParentComponent === this.commonAncestorComponent) {
        return;
      }
      start.push({
        startIndex,
        endIndex: startFragment.contentLength,
        fragment: startFragment
      });

      startParentComponent = startFragment.parentComponent;
      if (startParentComponent instanceof BranchAbstractComponent || startParentComponent instanceof BackboneAbstractComponent) {
        const childSlots = startParentComponent instanceof BranchAbstractComponent ?
          startParentComponent.slots :
          Array.from(startParentComponent);
        const end = childSlots.indexOf(this.endFragment);
        startFragmentPosition = childSlots.indexOf(startFragment);
        if (startParentComponent !== this.commonAncestorComponent && end === -1) {
          start.push(...childSlots.slice(startFragmentPosition + 1, childSlots.length).map(fragment => {
            return {
              startIndex: 0,
              endIndex: fragment.contentLength,
              fragment
            }
          }));
        }
      }
      startFragment = startParentComponent.parentFragment;
      startIndex = startFragment.indexOf(startParentComponent) + 1;
    }
    while (endFragment !== this.commonAncestorFragment) {
      if (commonAncestorComponent && endParentComponent === this.commonAncestorComponent) {
        return;
      }
      endParentComponent = endFragment.parentComponent;
      if (endParentComponent instanceof BranchAbstractComponent || endParentComponent instanceof BackboneAbstractComponent) {
        const childSlots = endParentComponent instanceof BranchAbstractComponent ?
          endParentComponent.slots :
          Array.from(endParentComponent);
        const index = childSlots.indexOf(this.startFragment);

        endFragmentPosition = childSlots.indexOf(endFragment);
        if (endParentComponent !== this.commonAncestorComponent && index === -1) {
          end.push(...childSlots.slice(0, endFragmentPosition).map(fragment => {
            return {
              startIndex: 0,
              endIndex: fragment.contentLength,
              fragment
            }
          }));
        }
      }

      end.push({
        startIndex: 0,
        endIndex,
        fragment: endFragment
      });
      endFragment = endParentComponent.parentFragment;
      endIndex = endFragment.indexOf(endParentComponent);
    }
    const result: TBRangeScope[] = [...start];
    if (startParentComponent === endParentComponent &&
      (startParentComponent instanceof BranchAbstractComponent || startParentComponent instanceof BackboneAbstractComponent)) {
      const slots = (startParentComponent instanceof BranchAbstractComponent ?
        startParentComponent.slots :
        Array.from(startParentComponent)).slice(startFragmentPosition + 1, endFragmentPosition);
      result.push(...slots.map(f => {
        return {
          startIndex: 0,
          endIndex: f.contentLength,
          fragment: f
        };
      }));
    } else {
      result.push({
        startIndex,
        endIndex,
        fragment: this.commonAncestorFragment
      })
    }
    // result.push(...end.reverse()); // 忘记原来为什么要翻转了，但这里引起了新的问题
    result.push(...end);

    return result.filter(item => {
      return item.startIndex < item.endIndex
    });
  }

  private getCommonAncestorFragment() {
    let startFragment = this.startFragment;
    let endFragment = this.endFragment;
    if (startFragment === endFragment) {
      return startFragment;
    }

    const startPaths: Fragment[] = [];
    const endPaths: Fragment[] = [];

    while (startFragment) {
      startPaths.push(startFragment);
      const parentComponent = startFragment.parentComponent;
      if (!parentComponent.parentFragment) {
        break;
      }
      startFragment = parentComponent.parentFragment;
    }

    while (endFragment) {
      endPaths.push(endFragment);
      const parentComponent = endFragment.parentComponent;
      if (!parentComponent.parentFragment) {
        break;
      }
      endFragment = parentComponent.parentFragment;
    }
    let f: Fragment = null;
    while (startPaths.length && endPaths.length) {
      const s = startPaths.pop();
      const e = endPaths.pop();
      if (s === e) {
        f = s;
      } else {
        break
      }
    }
    return f;
  }

  private getCommonAncestorComponent() {
    let startComponent = this.startFragment?.parentComponent;
    let endComponent = this.endFragment?.parentComponent;
    if (startComponent === endComponent) {
      return startComponent;
    }
    const startPaths: AbstractComponent[] = [];
    const endPaths: AbstractComponent[] = [];

    while (startComponent) {
      startPaths.push(startComponent);
      const parentFragment = startComponent.parentFragment;
      if (!parentFragment) {
        break;
      }
      startComponent = parentFragment.parentComponent;
    }

    while (endComponent) {
      endPaths.push(endComponent);
      const parentFragment = endComponent.parentFragment;
      if (!parentFragment) {
        break;
      }
      endComponent = parentFragment.parentComponent;
    }
    let f: AbstractComponent = null;
    while (startPaths.length && endPaths.length) {
      const s = startPaths.pop();
      const e = endPaths.pop();
      if (s === e) {
        f = s;
      } else {
        break
      }
    }
    return f;
  }

  private findFocusNodeAndOffset(fragment: Fragment, offset: number): { node: Node, offset: number } {
    const vElement = this.renderer.getVElementByFragment(fragment);

    const current = fragment.getContentAtIndex(offset);

    function findFocusNativeTextNode(renderer: Renderer,
                                     vElement: VElement,
                                     offset: number,
                                     toLeft: boolean): { node: Node, offset: number } {
      for (const item of vElement.childNodes) {
        const position = renderer.getPositionByVDom(item);
        if (toLeft ? position.endIndex < offset : position.endIndex <= offset) {
          continue
        }
        if (item instanceof VTextNode) {
          return {
            node: renderer.getNativeNodeByVDom(item),
            offset: offset - position.startIndex
          };
        }
        return findFocusNativeTextNode(renderer, item, offset, toLeft);
      }
    }

    function findFocusNativeElementNode(renderer: Renderer,
                                        vElement: VElement,
                                        offset: number): { node: Node, offset: number } {
      for (const item of vElement.childNodes) {
        const position = renderer.getPositionByVDom(item);
        if (position.endIndex <= offset) {
          continue
        }
        if (item instanceof VElement) {
          if (item.childNodes.length) {
            return findFocusNativeElementNode(renderer, item, offset);
          }
          const node = renderer.getNativeNodeByVDom(item);
          const parent = node.parentNode;
          return {
            node: parent,
            offset: Array.from(parent.childNodes).indexOf(node as ChildNode)
          }
        }
      }
    }

    if (typeof current === 'string') {
      const prev = fragment.getContentAtIndex(offset - 1);
      return findFocusNativeTextNode(this.renderer, vElement, offset, typeof prev === 'string');
    } else if (current instanceof AbstractComponent) {
      return findFocusNativeElementNode(this.renderer, vElement, offset);
    }
    const container = this.renderer.getNativeNodeByVDom(vElement);
    const lastChild = container.lastChild;
    if (lastChild.nodeType === Node.TEXT_NODE) {
      return {
        node: lastChild,
        offset: lastChild.textContent.length
      }
    }
    return {
      node: container,
      offset: container.childNodes.length
    }
  }

  private static findExpandedStartIndex(fragment: Fragment, index: number) {
    const contents = fragment.sliceContents(0, index);
    const len = contents.length;
    for (let i = len - 1; i >= 0; i--) {
      const item = contents[i];
      if (item instanceof DivisionAbstractComponent || item instanceof BranchAbstractComponent || item instanceof BackboneAbstractComponent) {
        break;
      }
      index -= item.length;
    }
    return index;
  }

  private static findExpandedEndIndex(fragment: Fragment, index: number) {
    const contents = fragment.sliceContents(index);

    for (let i = 0; i < contents.length; i++) {
      const item = contents[i];
      if (item instanceof DivisionAbstractComponent || item instanceof BranchAbstractComponent || item instanceof BackboneAbstractComponent) {
        break;
      }
      index += item.length;
    }
    return index;
  }

  private static findPosition(container: Node,
                              offset: number,
                              position: ElementPosition,
                              renderer: Renderer): { fragment: Fragment, index: number } {
    if (container.nodeType === Node.TEXT_NODE) {
      return {
        fragment: position.fragment,
        index: position.startIndex + offset
      }
    } else if (container.nodeType === Node.ELEMENT_NODE) {
      const childNodes = container.childNodes;
      if (childNodes.length === offset) {
        const child = childNodes[childNodes.length - 1];
        const childPosition = renderer.getPositionByNode(child);
        return {
          fragment: childPosition.fragment,
          index: childPosition.endIndex
        }
      } else {
        const child = childNodes[offset];
        const childPosition = renderer.getPositionByNode(child);
        return {
          fragment: childPosition.fragment,
          index: childPosition.startIndex
        }
      }
    }
  }
}
