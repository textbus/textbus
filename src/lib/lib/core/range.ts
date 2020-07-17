import { Renderer } from './renderer';
import { Constructor } from './constructor';
import { Fragment } from './fragment';
import { VElement, VTextNode } from './element';
import { BranchComponent, LeafComponent, DivisionComponent, Component, BackboneComponent } from './component';
import { BlockFormatter } from './formatter';

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
 * TBus 中的选区范围类，可操作基于 Fragment 和 Component 的范围，并提供了一系列的扩展方法供编辑富文本内容使用。
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

  constructor(private nativeRange: Range,
              private renderer: Renderer) {
    if ([1, 3].includes(nativeRange.commonAncestorContainer?.nodeType) &&
      renderer.getPositionByNode(nativeRange.startContainer) &&
      renderer.getPositionByNode(nativeRange.endContainer)) {
      this.startFragment = renderer.getPositionByNode(nativeRange.startContainer).fragment;
      this.endFragment = renderer.getPositionByNode(nativeRange.endContainer).fragment;
      if (nativeRange.startContainer.nodeType === Node.TEXT_NODE) {
        this.startIndex = renderer.getPositionByNode(nativeRange.startContainer).startIndex + nativeRange.startOffset;
      } else if (nativeRange.startContainer.nodeType === Node.ELEMENT_NODE) {
        this.startIndex = this.getOffset(nativeRange.startContainer as HTMLElement, nativeRange.startOffset, this.startFragment);
      }
      if (nativeRange.endContainer.nodeType === Node.TEXT_NODE) {
        this.endIndex = renderer.getPositionByNode(nativeRange.endContainer).startIndex + nativeRange.endOffset;
      } else if (nativeRange.endContainer.nodeType === Node.ELEMENT_NODE) {
        this.endIndex = this.getOffset(nativeRange.endContainer as HTMLElement, nativeRange.endOffset, this.endFragment);
      }
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
    const start = this.findFocusNodeAndOffset(this.startFragment, this.startIndex);
    const end = this.findFocusNodeAndOffset(this.endFragment, this.endIndex);
    this.nativeRange.setStart(start.node, start.offset);
    this.nativeRange.setEnd(end.node, end.offset);
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

    let startChildComponent: BranchComponent | DivisionComponent | BackboneComponent = null;
    let endChildComponent: BranchComponent | DivisionComponent | BackboneComponent = null;

    while (startFragment !== commonAncestorFragment) {
      startChildComponent = this.renderer.getParentComponent(startFragment);
      startFragment = this.renderer.getParentFragment(startChildComponent);
      startIndex = startFragment.indexOf(startChildComponent);
    }

    while (endFragment !== commonAncestorFragment) {
      endChildComponent = this.renderer.getParentComponent(endFragment);
      endFragment = this.renderer.getParentFragment(endChildComponent);
      endIndex = endFragment.indexOf(endChildComponent);
    }

    return {
      startIndex,
      startFragment,
      startChildComponent,
      endIndex,
      endFragment,
      endChildComponent
    }
  }

  /**
   * 获取当前选区范围在 BackboneComponent 插槽的范围。
   * @param of BackboneComponent 子类的构造 class。
   * @param filter 可选的过滤条件，可根据实例判断是否为想要找的 BackboneComponent 实例。
   */
  getSlotRange<T extends BranchComponent | BackboneComponent>(of: Constructor<T>, filter?: (instance: T) => boolean): Array<{ component: T; startIndex: number; endIndex: number }> {
    const maps: Array<{ component: T, index: number }> = [];
    this.getSelectedScope().forEach(scope => {
      const context = this.renderer.getContext(scope.fragment, of, filter);
      let fragment: Fragment = scope.fragment;
      while (fragment) {
        const parentComponent = this.renderer.getParentComponent(fragment);
        if (parentComponent === context) {
          maps.push({
            component: context,
            index: context instanceof BackboneComponent ?
              context.indexOf(fragment) :
              (context as BranchComponent).slots.indexOf(fragment)
          })
          break;
        }
        fragment = this.renderer.getParentFragment(parentComponent);
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
        if (c instanceof DivisionComponent) {
          newScope = null;
          scopes.push(...fn(c.slot, 0, c.slot.contentLength));
        } else if (c instanceof BranchComponent) {
          newScope = null;
          c.slots.forEach(childFragment => {
            scopes.push(...fn(childFragment, 0, childFragment.contentLength));
          })
        } else if (c instanceof BackboneComponent) {
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
   * 删除选区范围内的内容。
   * 注意：
   * 此方法并不会合并选区。如果要删除内容，且要合并选区，请调用 connect 方法。
   */
  deleteSelectedScope() {
    this.getSelectedScope().reverse().forEach(scope => {
      if (scope.startIndex === 0 && scope.endIndex === scope.fragment.contentLength) {
        const parentComponent = this.renderer.getParentComponent(scope.fragment);
        scope.fragment.remove(0);
        if (parentComponent instanceof BackboneComponent) {
          if (parentComponent.canDelete(scope.fragment)) {
            let position = this.getPreviousPosition();
            const parentFragment = this.renderer.getParentFragment(parentComponent);
            const index = parentFragment.indexOf(parentComponent);
            parentFragment.remove(index, 1);

            if (parentFragment.contentLength === 0) {
              this.deleteEmptyTree(parentFragment);
            }

            if (position.fragment === this.startFragment) {
              const nextContent = parentFragment.getContentAtIndex(index);
              if (nextContent instanceof DivisionComponent) {
                position = this.findFirstPosition(nextContent.slot);
              } else if (nextContent instanceof BranchComponent) {
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
  deleteEmptyTree(fragment: Fragment, endFragment?: Fragment): BranchComponent | BackboneComponent | Fragment {
    if (fragment === endFragment) {
      return fragment;
    }
    const parentComponent = this.renderer.getParentComponent(fragment);
    if (parentComponent instanceof DivisionComponent) {
      const parentFragment = this.renderer.getParentFragment(parentComponent);
      parentFragment.cut(parentFragment.indexOf(parentComponent), 1);
      if (parentFragment.contentLength === 0) {
        return this.deleteEmptyTree(parentFragment, endFragment);
      }
      return parentFragment;
    } else if (parentComponent instanceof BranchComponent) {
      parentComponent.slots.splice(parentComponent.slots.indexOf(fragment), 1);
      if (parentComponent.slots.length === 0) {
        const parentFragment = this.renderer.getParentFragment(parentComponent);
        const index = parentFragment.indexOf(parentComponent);
        parentFragment.cut(index, 1);
        if (parentFragment.contentLength === 0) {
          return this.deleteEmptyTree(parentFragment, endFragment);
        }
        return parentFragment;
      }
      return parentComponent;
    } else if (parentComponent instanceof BackboneComponent) {
      fragment.clean();
      const b = parentComponent.canDelete(fragment);
      if (b) {
        const parentFragment = this.renderer.getParentFragment(parentComponent);
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
      if (prev instanceof DivisionComponent) {
        return this.findLastChild(prev.slot);
      }
      if (prev instanceof BranchComponent) {
        return this.findLastChild(prev.slots[prev.slots.length - 1]);
      }
      if (prev instanceof BackboneComponent) {
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
      const parentComponent = this.renderer.getParentComponent(fragment);
      if (!parentComponent) {
        return {
          fragment: cacheFragment,
          index: 0
        };
      }
      if (parentComponent instanceof BranchComponent) {
        const fragmentIndex = parentComponent.slots.indexOf(fragment);
        if (fragmentIndex > 0) {
          return this.findLastChild(parentComponent.slots[fragmentIndex - 1]);
        }
      }

      if (parentComponent instanceof BackboneComponent) {
        const fragmentIndex = parentComponent.indexOf(fragment);
        if (fragmentIndex > 0) {
          return this.findLastChild(parentComponent.getSlotAtIndex(fragmentIndex - 1));
        }
      }

      const parentFragment = this.renderer.getParentFragment(parentComponent);
      const componentIndex = parentFragment.indexOf(parentComponent);
      if (componentIndex > 0) {
        const prevContent = parentFragment.getContentAtIndex(componentIndex - 1);
        if (prevContent instanceof DivisionComponent) {
          return this.findLastChild(prevContent.slot);
        }
        if (prevContent instanceof BranchComponent) {
          return this.findLastChild(prevContent.slots[prevContent.slots.length - 1]);
        }
        if (prevContent instanceof BackboneComponent) {
          return this.findLastChild(prevContent.getSlotAtIndex(prevContent.slotCount - 1));
        }
        return {
          fragment: parentFragment,
          index: componentIndex
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
      if (current instanceof LeafComponent && current.tagName === 'br') {
        offset++;
      }
    }
    if (offset < fragment.contentLength) {
      const next = fragment.getContentAtIndex(offset);
      if (next instanceof DivisionComponent) {
        return this.findFirstPosition(next.slot);
      }
      if (next instanceof BranchComponent) {
        return this.findFirstPosition(next.slots[0]);
      }
      if (next instanceof BackboneComponent) {
        return this.findFirstPosition(next.getSlotAtIndex(0));
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
      const parentComponent = this.renderer.getParentComponent(fragment);
      if (!parentComponent) {
        const len = cacheFragment.contentLength;
        const last = cacheFragment.getContentAtIndex(len - 1);
        return {
          fragment: cacheFragment,
          index: last instanceof LeafComponent && last.tagName === 'br' ? len - 1 : len
        }
      }
      if (parentComponent instanceof BranchComponent) {
        const fragmentIndex = parentComponent.slots.indexOf(fragment);
        if (fragmentIndex < parentComponent.slots.length - 1) {
          return this.findFirstPosition(parentComponent.slots[fragmentIndex + 1]);
        }
      }
      if (parentComponent instanceof BackboneComponent) {
        const fragmentIndex = parentComponent.indexOf(fragment);
        if (fragmentIndex < parentComponent.slotCount - 1) {
          return this.findFirstPosition(parentComponent.getSlotAtIndex(fragmentIndex + 1));
        }
      }
      const parentFragment = this.renderer.getParentFragment(parentComponent);
      const componentIndex = parentFragment.indexOf(parentComponent);
      if (componentIndex < parentFragment.contentLength - 1) {
        const nextContent = parentFragment.getContentAtIndex(componentIndex + 1);
        if (nextContent instanceof DivisionComponent) {
          return this.findFirstPosition(nextContent.slot);
        }
        if (nextContent instanceof BranchComponent) {
          return this.findFirstPosition(nextContent.slots[0]);
        }
        if (nextContent instanceof BackboneComponent) {
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
      let rect2 = range2.getRangePosition();
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
      let rect2 = range2.getRangePosition();
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
    if (first instanceof DivisionComponent) {
      return this.findFirstPosition(first.slot);
    }
    if (first instanceof BranchComponent) {
      const firstFragment = first.slots[0];
      return this.findFirstPosition(firstFragment);
    }

    if (first instanceof BackboneComponent) {
      const firstFragment = first.getSlotAtIndex(0);
      return this.findFirstPosition(firstFragment);
    }
    return {
      index: 0,
      fragment
    };
  }

  /**
   * 查找一个 fragment 下的最后一个可以放置光标的位置。
   * @param fragment
   */
  findLastChild(fragment: Fragment): TBRangePosition {
    const last = fragment.getContentAtIndex(fragment.contentLength - 1);
    if (last instanceof DivisionComponent) {
      return this.findLastChild(last.slot);
    }
    if (last instanceof BranchComponent) {
      const lastFragment = last.slots[last.slots.length - 1];
      return this.findLastChild(lastFragment);
    }
    if (last instanceof BackboneComponent) {
      const lastFragment = last.getSlotAtIndex(last.slotCount - 1);
      return this.findLastChild(lastFragment);
    }
    return {
      index: last instanceof LeafComponent && last.tagName === 'br' ?
        fragment.contentLength - 1 :
        fragment.contentLength,
      fragment
    }
  }

  /**
   * 获取选区范围在文档中的坐标位置。
   */
  getRangePosition() {
    return TBRange.getRangePosition(this.nativeRange);
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
      this.deleteSelectedScope();
    } else {
      let isDeleteFragment = false;
      if (this.startIndex === 0) {
        const {fragment, index} = this.findFirstPosition(startFragment);
        isDeleteFragment = fragment === startFragment && index === this.startIndex;
      }

      this.deleteSelectedScope();
      if (isDeleteFragment && startFragment === this.startFragment) {
        this.startFragment.from(this.endFragment);
        const firstPosition = this.findFirstPosition(this.startFragment);
        this.setStart(firstPosition.fragment, firstPosition.index);
        this.deleteEmptyTree(this.endFragment);
      } else {
        if (this.startFragment !== this.endFragment) {
          const last = this.endFragment.cut(0);
          this.deleteEmptyTree(this.endFragment);
          const startIndex = this.startIndex + 1;
          last.contents.reverse().forEach(c => this.startFragment.insert(c, startIndex));
          Array.from(last.formatMap.keys())
            .filter(token => !(token instanceof BlockFormatter))
            .map(token => {
              const formats = last.formatMap.get(token) || [];
              formats.forEach(f => {
                f.startIndex += startIndex;
                f.endIndex += startIndex;
                this.startFragment.apply(token, f);
              })
            });
        }

      }
    }

    this.collapse();
  }

  static getRangePosition(range: Range) {
    let rect = range.getBoundingClientRect();
    const {startContainer, startOffset} = range;
    const offsetNode = startContainer.childNodes[startOffset];
    if (startContainer.nodeType === Node.ELEMENT_NODE) {
      if (offsetNode && /^(br|img)$/i.test(offsetNode.nodeName)) {
        rect = (offsetNode as HTMLElement).getBoundingClientRect();
      } else if (offsetNode && offsetNode.nodeType === Node.ELEMENT_NODE && offsetNode.childNodes.length === 0) {
        const cloneRange = range.cloneRange();
        const textNode = offsetNode.ownerDocument.createTextNode('\u200b');
        offsetNode.appendChild(textNode);
        cloneRange.selectNodeContents(offsetNode);
        rect = cloneRange.getBoundingClientRect();
        cloneRange.detach();
      } else if (!offsetNode) {
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
    let startParentComponent: BranchComponent | DivisionComponent | BackboneComponent = null;
    let endParentComponent: BranchComponent | DivisionComponent | BackboneComponent = null;

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

      startParentComponent = this.renderer.getParentComponent(startFragment);
      if (startParentComponent instanceof BranchComponent || startParentComponent instanceof BackboneComponent) {
        const childSlots = startParentComponent instanceof BranchComponent ?
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
      startFragment = this.renderer.getParentFragment(startParentComponent);
      startIndex = startFragment.indexOf(startParentComponent) + 1;
    }
    while (endFragment !== this.commonAncestorFragment) {
      if (commonAncestorComponent && endParentComponent === this.commonAncestorComponent) {
        return;
      }
      endParentComponent = this.renderer.getParentComponent(endFragment);
      if (endParentComponent instanceof BranchComponent || endParentComponent instanceof BackboneComponent) {
        const childSlots = endParentComponent instanceof BranchComponent ?
          endParentComponent.slots :
          Array.from(endParentComponent);
        const start = childSlots.indexOf(this.startFragment);

        endFragmentPosition = childSlots.indexOf(endFragment);
        if (endParentComponent !== this.commonAncestorComponent && start === -1) {
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
      endFragment = this.renderer.getParentFragment(endParentComponent);
      endIndex = endFragment.indexOf(endParentComponent);
    }
    let result: TBRangeScope[] = [...start];
    if (startParentComponent === endParentComponent &&
      (startParentComponent instanceof BranchComponent || startParentComponent instanceof BackboneComponent)) {
      const slots = (startParentComponent instanceof BranchComponent ?
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
    result.push(...end.reverse());

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
      const parentComponent = this.renderer.getParentComponent(startFragment);
      if (!parentComponent) {
        break;
      }
      startFragment = this.renderer.getParentFragment(parentComponent);
    }

    while (endFragment) {
      endPaths.push(endFragment);
      const parentComponent = this.renderer.getParentComponent(endFragment);
      if (!parentComponent) {
        break;
      }
      endFragment = this.renderer.getParentFragment(parentComponent);
    }
    let f: Fragment = null;
    while (startPaths.length && endPaths.length) {
      let s = startPaths.pop();
      let e = endPaths.pop();
      if (s === e) {
        f = s;
      } else {
        break
      }
    }
    return f;
  }

  private getCommonAncestorComponent() {
    let startComponent = this.renderer.getParentComponent(this.startFragment);
    let endComponent = this.renderer.getParentComponent(this.endFragment);
    if (startComponent === endComponent) {
      return startComponent;
    }
    const startPaths: Component[] = [];
    const endPaths: Component[] = [];

    while (startComponent) {
      startPaths.push(startComponent);
      const parentFragment = this.renderer.getParentFragment(startComponent);
      if (!parentFragment) {
        break;
      }
      startComponent = this.renderer.getParentComponent(parentFragment);
    }

    while (endComponent) {
      endPaths.push(endComponent);
      const parentFragment = this.renderer.getParentFragment(endComponent);
      if (!parentFragment) {
        break;
      }
      endComponent = this.renderer.getParentComponent(parentFragment);
    }
    let f: Component = null;
    while (startPaths.length && endPaths.length) {
      let s = startPaths.pop();
      let e = endPaths.pop();
      if (s === e) {
        f = s;
      } else {
        break
      }
    }
    return f;
  }

  private getOffset(node: HTMLElement, offset: number, fragment: Fragment) {
    if (node.childNodes.length === offset) {
      const position = this.renderer.getPositionByNode(node);
      // if(position.fragment !== fragment){
      //   return
      // }
      if (position) {
        return position.endIndex;
      }
      return null;
    }
    const position = this.renderer.getPositionByNode(node.childNodes[offset]);
    if (position.fragment !== fragment) {
      return this.renderer.getPositionByNode(node.childNodes[offset - 1]).endIndex;
    }
    if (position) {
      return position.startIndex;
    }
    return null;
  }

  private findFocusNodeAndOffset(fragment: Fragment, offset: number): { node: Node, offset: number } {
    let vElement = this.renderer.getVElementByFragment(fragment);
    parentLoop: while (vElement) {
      const len = vElement.childNodes.length;
      if (len === 0) {
        return {
          node: this.renderer.getNativeNodeByVDom(vElement),
          offset: 0
        };
      }
      let index = 0;
      for (let i = 0; i < len; i++) {
        const child = vElement.childNodes[i];
        const position = this.renderer.getPositionByVDom(child);
        if (position.fragment === fragment) {
          index = position.endIndex;
          if (position.startIndex <= offset && position.endIndex >= offset) {
            if (i < len - 1 && position.endIndex === offset) {
              if (child instanceof VTextNode) {
                return {
                  node: this.renderer.getNativeNodeByVDom(child),
                  offset: child.textContent.length
                }
              }
              if (position.endIndex === offset) {
                const afterContent = fragment.sliceContents(position.endIndex, position.endIndex + 1)[0];
                if (afterContent instanceof DivisionComponent ||
                  afterContent instanceof BranchComponent ||
                  afterContent instanceof BackboneComponent) {
                  vElement = child;
                  continue parentLoop;
                }
              }
              continue;
            }
            if (child instanceof VElement) {
              if (child.childNodes.length === 0) {
                const node = this.renderer.getNativeNodeByVDom(child);
                const parentNode = node.parentNode;
                const index = Array.from(parentNode.childNodes).indexOf(node as any);
                return {
                  node: parentNode,
                  offset: position.endIndex === offset ? index + 1 : index
                }
              }
              vElement = child;
              continue parentLoop;
            }
            return {
              node: this.renderer.getNativeNodeByVDom(child),
              offset: offset - position.startIndex
            }
          }
        } else {
          if (index === offset) {
            let nextPosition = this.findFirstPosition(position.fragment);
            if (nextPosition.fragment.contentLength === 0) {
              const node = this.renderer.getNativeNodeByVDom(vElement);
              return {
                node,
                offset: Array.from(node.childNodes).indexOf(this.renderer.getNativeNodeByVDom(child) as ChildNode)
              }
            }
            this.setStart(position.fragment, 0);
            this.collapse();
            return this.findFocusNodeAndOffset(position.fragment, 0);
          }
          index++;
        }

      }
      throw new Error('未找到对应节点');
    }
    throw new Error('DOM 与虚拟节点不同步！');
  }

  private static findExpandedStartIndex(fragment: Fragment, index: number) {
    for (; index > 0; index--) {
      const item = fragment.getContentAtIndex(index);
      if (item instanceof DivisionComponent || item instanceof BranchComponent || item instanceof BackboneComponent) {
        break;
      }
    }
    return index;
  }

  private static findExpandedEndIndex(fragment: Fragment, index: number) {
    for (; index < fragment.contentLength; index++) {
      const item = fragment.getContentAtIndex(index);
      if (item instanceof DivisionComponent || item instanceof BranchComponent || item instanceof BackboneComponent) {
        break;
      }
    }
    return index;
  }
}
