import { Renderer } from './renderer';
import { Fragment } from './fragment';
import { VElement } from './element';
import { MediaTemplate, Template } from './template';
import { BlockFormatter } from './formatter';

/**
 * 标识 Fragment 中的一个位置
 */
export interface TBRangePosition {
  fragment: Fragment;
  index: number;
}

/**
 * 标识一个选中 Fragment 的范围
 */
export interface SelectedScope {
  startIndex: number;
  endIndex: number;
  fragment: Fragment;
}

export class TBRange {
  startIndex: number;
  endIndex: number;

  /**
   * 选区开始的 Fragment
   */
  get startFragment() {
    return this._startFragment;
  }

  set startFragment(v: Fragment) {
    this._startFragment = v;
    this._commonAncestorFragment = null;
  }

  /**
   * 选区结束的 Fragment
   */
  get endFragment() {
    return this._endFragment;
  }

  set endFragment(v: Fragment) {
    this._endFragment = v;
    this._commonAncestorFragment = null;
  }

  /**
   * 当前选区最近的公共 Fragment
   */
  get commonAncestorFragment() {
    if (!this._commonAncestorFragment) {
      this._commonAncestorFragment = this.getCommonAncestorFragment();
    }
    return this._commonAncestorFragment;
  }

  get commonAncestorTemplate() {
    if (!this._commonAncestorTemplate) {
      this._commonAncestorTemplate = this.getCommonAncestorTemplate();
    }
    return this._commonAncestorTemplate;
  }


  /**
   * 当前选区是否折叠
   */
  get collapsed() {
    return this.startFragment === this.commonAncestorFragment &&
      this.endFragment === this.commonAncestorFragment &&
      this.startIndex === this.endIndex;
  }

  private _startFragment: Fragment;
  private _endFragment: Fragment;
  private _commonAncestorFragment: Fragment;
  private _commonAncestorTemplate: Template;

  constructor(private nativeRange: Range,
              private renderer: Renderer) {
    if ([1, 3].includes(nativeRange.commonAncestorContainer.nodeType)) {
      if (nativeRange.startContainer.nodeType === 3) {
        this.startIndex = renderer.getPositionByNode(nativeRange.startContainer).startIndex + nativeRange.startOffset;
      } else if (nativeRange.startContainer.nodeType === 1) {
        this.startIndex = this.getOffset(nativeRange.startContainer, nativeRange.startOffset);
      }
      if (nativeRange.endContainer.nodeType === 3) {
        this.endIndex = renderer.getPositionByNode(nativeRange.endContainer).startIndex + nativeRange.endOffset;
      } else if (nativeRange.endContainer.nodeType === 1) {
        this.endIndex = this.getOffset(nativeRange.endContainer, nativeRange.endOffset);
      }

      this.startFragment = renderer.getPositionByNode(nativeRange.startContainer).fragment;
      this.endFragment = renderer.getPositionByNode(nativeRange.endContainer).fragment;
    }
  }

  clone() {
    const r = new TBRange(this.nativeRange.cloneRange(), this.renderer);
    Object.assign(r, this);
    return r;
  }

  restore() {
    const start = this.findFocusNodeAndOffset(this.startFragment, this.startIndex);
    const end = this.findFocusNodeAndOffset(this.endFragment, this.endIndex);
    this.nativeRange.setStart(start.node, start.offset);
    this.nativeRange.setEnd(end.node, end.offset);
    return this;
  }

  setStart(fragment: Fragment, offset: number) {
    this.startFragment = fragment;
    this.startIndex = offset;
  }

  setEnd(fragment: Fragment, offset: number) {
    this.endFragment = fragment;
    this.endIndex = offset;
  }

  /**
   * 获取当前选区在公共 Fragment 中的范围
   */
  getCommonAncestorFragmentScope() {
    let startFragment = this.startFragment;
    let endFragment = this.endFragment;
    let startIndex = this.startIndex;
    let endIndex = this.endIndex;

    while (startFragment !== this.commonAncestorFragment) {
      const parentTemplate = this.renderer.getParentTemplateByFragment(startFragment);
      startFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      startIndex = startFragment.indexOf(parentTemplate);
    }

    while (endFragment !== this.commonAncestorFragment) {
      const parentTemplate = this.renderer.getParentTemplateByFragment(endFragment);
      endFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      endIndex = endFragment.indexOf(parentTemplate);
    }

    return {
      startIndex,
      endIndex
    }
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
  getSelectedScope(): SelectedScope[] {
    const start: SelectedScope[] = [];
    const end: SelectedScope[] = [];
    let startFragment = this.startFragment;
    let endFragment = this.endFragment;
    let startIndex = this.startIndex;
    let endIndex = this.endIndex;

    if (startFragment === this.commonAncestorFragment &&
      endFragment === this.commonAncestorFragment &&
      startIndex === endIndex) {
      return [{
        startIndex, endIndex, fragment: startFragment
      }];
    }

    while (startFragment !== this.commonAncestorFragment) {
      start.push({
        startIndex,
        endIndex: startFragment.contentLength,
        fragment: startFragment
      });
      const parentTemplate = this.renderer.getParentTemplateByFragment(startFragment);
      const childSlots = parentTemplate.childSlots;
      const end = childSlots.indexOf(this.endFragment);

      start.push(...childSlots.slice(
        childSlots.indexOf(startFragment) + 1,
        end === -1 ? childSlots.length : end
      ).map(fragment => {
        return {
          startIndex: 0,
          endIndex: fragment.contentLength,
          fragment
        }
      }));
      startFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      startIndex = startFragment.indexOf(parentTemplate) + 1;
    }
    while (endFragment !== this.commonAncestorFragment) {
      end.push({
        startIndex: 0,
        endIndex,
        fragment: endFragment
      });
      const parentTemplate = this.renderer.getParentTemplateByFragment(endFragment);
      const childSlots = parentTemplate.childSlots;
      const start = childSlots.indexOf(this.startFragment);
      end.push(...childSlots.slice(
        start === -1 ? 0 : start + 1,
        parentTemplate.childSlots.indexOf(endFragment)
      ).map(fragment => {
        return {
          startIndex: 0,
          endIndex: fragment.contentLength,
          fragment
        }
      }));
      endFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      endIndex = endFragment.indexOf(parentTemplate);
    }
    return [...start, {
      startIndex,
      endIndex,
      fragment: this.commonAncestorFragment
    }, ...end].filter(item => {
      return item.startIndex < item.endIndex
    });
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

  getBlockFragmentsBySelectedScope(): SelectedScope[] {
    const start: SelectedScope[] = [];
    const end: SelectedScope[] = [];
    let startFragment = this.startFragment;
    let endFragment = this.endFragment;
    let startIndex = TBRange.findBlockStartIndex(this.startFragment, this.startIndex);
    let endIndex = TBRange.findBlockEndIndex(this.endFragment, this.endIndex);

    while (startFragment !== this.commonAncestorFragment) {
      start.push({
        startIndex,
        endIndex: startFragment.contentLength,
        fragment: startFragment
      });

      const parentTemplate = this.renderer.getParentTemplateByFragment(startFragment);
      const childSlots = parentTemplate.childSlots;
      const end = childSlots.indexOf(this.endFragment);

      start.push(...childSlots.slice(
        childSlots.indexOf(startFragment) + 1,
        end === -1 ? childSlots.length : end
      ).map(fragment => {
        return {
          startIndex: 0,
          endIndex: fragment.contentLength,
          fragment
        }
      }));
      startFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      startIndex = startFragment.indexOf(parentTemplate) + 1;
    }
    while (endFragment !== this.commonAncestorFragment) {
      end.push({
        startIndex: 0,
        endIndex,
        fragment: endFragment
      });
      const parentTemplate = this.renderer.getParentTemplateByFragment(endFragment);
      const childSlots = parentTemplate.childSlots;
      const start = childSlots.indexOf(this.startFragment);
      end.push(...childSlots.slice(
        start === -1 ? 0 : start + 1,
        parentTemplate.childSlots.indexOf(endFragment)
      ).map(fragment => {
        return {
          startIndex: 0,
          endIndex: fragment.contentLength,
          fragment
        }
      }));
      endFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      endIndex = endFragment.indexOf(parentTemplate);
    }
    return [...start, {
      startIndex,
      endIndex,
      fragment: this.commonAncestorFragment
    }, ...end].filter(item => {
      return item.startIndex < item.endIndex
    }).reduce((previousValue, currentValue) => {
      return previousValue.concat(this.contentsToBlockRange(
        currentValue.fragment,
        currentValue.startIndex,
        currentValue.endIndex));
    }, []);
  }

  deleteSelectedScope() {
    this.getSelectedScope().reverse().forEach(scope => {
      if (scope.startIndex === 0 && scope.endIndex === scope.fragment.contentLength) {
        this.deleteEmptyTree(scope.fragment);
      } else {
        scope.fragment.delete(scope.startIndex, scope.endIndex - scope.startIndex);
      }
    });
    return this;
  }

  deleteEmptyTree(fragment: Fragment): TBRange {
    const parentTemplate = this.renderer.getParentTemplateByFragment(fragment);
    if (parentTemplate) {
      parentTemplate.childSlots.splice(parentTemplate.childSlots.indexOf(fragment), 1);
      if (parentTemplate.childSlots.length === 0) {
        const parentFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
        const index = parentFragment.indexOf(parentTemplate);
        parentFragment.delete(index, 1);
        if (parentFragment.contentLength === 0) {
          return this.deleteEmptyTree(parentFragment);
        }
      }
    }
    return this;
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
   * 获取上一个选区位置
   */
  getPreviousPosition(): TBRangePosition {
    let fragment = this.startFragment;

    if (this.startIndex > 0) {
      const prev = fragment.getContentAtIndex(this.startIndex - 1);
      if (prev instanceof Template) {
        return this.findLastChild(prev.childSlots[prev.childSlots.length - 1]);
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
      const parentTemplate = this.renderer.getParentTemplateByFragment(fragment);
      if (!parentTemplate) {
        return {
          fragment: cacheFragment,
          index: 0
        };
      }
      const fragmentIndex = parentTemplate.childSlots.indexOf(fragment);
      if (fragmentIndex > 0) {
        return this.findLastChild(parentTemplate[fragmentIndex - 1]);
      }
      const parentFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      const templateIndex = parentFragment.indexOf(parentTemplate);
      if (templateIndex > 0) {
        const prevContent = parentFragment.getContentAtIndex(templateIndex - 1);
        if (prevContent instanceof Template) {
          return this.findLastChild(prevContent.childSlots[prevContent.childSlots.length - 1]);
        }
        return {
          fragment: parentFragment,
          index: templateIndex - 1
        }
      } else {
        fragment = parentFragment;
      }
    }
  }

  /**
   * 获取下一个选区位置
   */
  getNextPosition(): TBRangePosition {
    let fragment = this.endFragment;
    let offset = this.endIndex;
    if (offset === fragment.contentLength - 1) {
      const current = fragment.getContentAtIndex(offset);
      if (current instanceof MediaTemplate && current.tagName === 'br') {
        offset++;
      }
    }
    if (offset < fragment.contentLength) {
      const next = fragment.getContentAtIndex(offset + 1);
      if (next instanceof Template) {
        return this.findFirstPosition(next.childSlots[0]);
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
      const parentTemplate = this.renderer.getParentTemplateByFragment(fragment);
      if (!parentTemplate) {
        return {
          fragment: cacheFragment,
          index: cacheFragment.contentLength
        }
      }
      const fragmentIndex = parentTemplate.childSlots.indexOf(fragment);
      if (fragmentIndex < parentTemplate.childSlots.length - 1) {
        return this.findFirstPosition(parentTemplate.childSlots[fragmentIndex + 1]);
      }
      const parentFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      const templateIndex = parentFragment.indexOf(parentTemplate);
      if (templateIndex < parentFragment.contentLength - 1) {
        const nextContent = parentFragment.getContentAtIndex(templateIndex + 1);
        if (nextContent instanceof Template) {
          return this.findFirstPosition(nextContent.childSlots[0]);
        }
        return {
          fragment: parentFragment,
          index: templateIndex + 1
        }
      } else {
        fragment = parentFragment;
      }
    }
  }

  /**
   * 获取选区向上移动一行的位置
   * @param left
   * @param top
   */
  getPreviousLinePosition(left: number, top: number): TBRangePosition {
    const range2 = this.clone();
    let isToPrevLine = false;
    let loopCount = 0;
    let minLeft = left;
    let minTop = top;
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
        if (rect2.left > minLeft) {
          isToPrevLine = true;
        } else if (rect2.left === minLeft && rect2.top === minTop) {
          return position;
        }
        minLeft = rect2.left;
        minTop = rect2.top;
      }
      if (isToPrevLine) {
        if (rect2.left < left) {
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
   * 获取选区向下移动一行的位置
   * @param left
   * @param top
   */
  getNextLinePosition(left: number, top: number): TBRangePosition {
    const range2 = this.clone();
    let isToNextLine = false;
    let loopCount = 0;
    let maxRight = left;
    let minTop = top;
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
        if (rect2.left < maxRight) {
          isToNextLine = true;
        } else if (rect2.left === maxRight && rect2.top === minTop) {
          return position;
        }
        maxRight = rect2.left;
        minTop = rect2.top;
        oldPosition = position;
      }
      if (isToNextLine) {
        if (rect2.left > left) {
          return oldPosition;
        }
        if (oldPosition) {
          if (rect2.left < oldLeft) {
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

  findFirstPosition(fragment: Fragment): TBRangePosition {
    const first = fragment.getContentAtIndex(0);
    if (first instanceof Template) {
      const firstFragment = first.childSlots[0];
      return this.findFirstPosition(firstFragment);
    }
    return {
      index: 0,
      fragment
    };
  }

  findLastChild(fragment: Fragment): TBRangePosition {
    const last = fragment.getContentAtIndex(fragment.contentLength - 1);
    if (last instanceof Template) {
      const lastFragment = last.childSlots[last.childSlots.length - 1];
      return this.findLastChild(lastFragment);
      // } else if (last instanceof MediaTemplate && last.tagName === 'br') {
      //   return {
      //     index: fragment.contentLength - 1,
      //     fragment
      //   };
    }
    return {
      index: fragment.contentLength,
      fragment
    }
  }

  getRangePosition() {
    return TBRange.getRangePosition(this.nativeRange);
  }

  connect() {
    if (this.collapsed) {
      return;
    }
    this.deleteSelectedScope();
    if (this.startFragment !== this.endFragment) {
      const ff = this.endFragment.delete(0);
      const startIndex = this.startFragment.contentLength;
      ff.contents.forEach(c => this.startFragment.append(c));
      ff.formatRanges
        .filter(f => !(f.renderer instanceof BlockFormatter))
        .map(f => {
          f.startIndex += startIndex;
          f.endIndex += startIndex;
          return f;
        })
        .forEach(f => this.startFragment.mergeFormat(f));
    }
    this.collapse();
  }

  static getRangePosition(range: Range) {
    let rect = range.getBoundingClientRect();
    const {startContainer, startOffset} = range;
    const offsetNode = startContainer.childNodes[startOffset];
    if (startContainer.nodeType === 1) {
      if (offsetNode && /^(br|img)$/i.test(offsetNode.nodeName)) {
        rect = (offsetNode as HTMLElement).getBoundingClientRect();
      } else if (offsetNode && offsetNode.nodeType === 1 && offsetNode.childNodes.length === 0) {
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
      const parentTemplate = this.renderer.getParentTemplateByFragment(startFragment);
      if (!parentTemplate) {
        break;
      }
      startFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
    }

    while (endFragment) {
      endPaths.push(endFragment);
      const parentTemplate = this.renderer.getParentTemplateByFragment(endFragment);
      if (!parentTemplate) {
        break;
      }
      endFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
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

  private getCommonAncestorTemplate() {
    const startTemplate = this.renderer.getParentTemplateByFragment(this.startFragment);
    const endTemplate = this.renderer.getParentTemplateByFragment(this.endFragment);
    if (startTemplate === endTemplate) {
      return startTemplate;
    }
    return this.renderer.getParentTemplateByFragment(this.commonAncestorFragment);
  }

  private contentsToBlockRange(fragment: Fragment, startIndex: number, endIndex: number) {
    const ranges: SelectedScope[] = [];
    let scope: SelectedScope;
    let index = 0;
    fragment.sliceContents(startIndex, endIndex).forEach(content => {
      if (content instanceof Fragment) {
        scope = null;
        ranges.push(...this.contentsToBlockRange(content, 0, content.contentLength));
      } else {
        if (!scope) {
          scope = {
            startIndex: index,
            endIndex: index + content.length,
            fragment
          };
          ranges.push(scope);
        } else {
          scope.endIndex = index + content.length
        }
      }
      index += content.length;
    });
    return ranges;
  }

  private getOffset(node: Node, offset: number) {
    if (node.nodeType === 1) {
      if (node.childNodes.length === offset) {
        return this.renderer.getPositionByNode(node).fragment.contentLength;
      }
      return this.renderer.getPositionByNode(node.childNodes[offset]).startIndex;
    }
    return offset;
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
      for (let i = 0; i < len; i++) {
        const child = vElement.childNodes[i];
        const position = this.renderer.getPositionByVDom(child);
        if (position.fragment !== fragment) {
          throw new Error('当前节点的 fragment 和指定的 fragment 不匹配')
        }
        if (position.startIndex <= offset && position.endIndex >= offset) {
          if (i < len - 1 && position.endIndex === offset) {
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
      }
      throw new Error('未找到对应节点');
    }
    throw new Error('DOM 与虚拟节点不同步！');
  }

  private static findBlockStartIndex(fragment: Fragment, index: number) {
    let startIndex: number = 0;
    for (let i = 0; i < index; i++) {

      const item = fragment.getContentAtIndex(i);
      if (item instanceof Template) {
        startIndex = i + 1;
      }
    }
    return startIndex;
  }

  private static findBlockEndIndex(fragment: Fragment, index: number) {
    for (; index < fragment.contentLength; index++) {
      const item = fragment.getContentAtIndex(index);
      if (item instanceof Template) {
        break;
      }
    }
    return index;
  }
}
