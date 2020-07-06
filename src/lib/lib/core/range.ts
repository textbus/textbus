import { Constructor, Renderer } from './renderer';
import { Fragment } from './fragment';
import { VElement, VTextNode } from './element';
import { BackboneTemplate, LeafTemplate, BranchTemplate, Template } from './template';
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
export interface TBRangeScope {
  startIndex: number;
  endIndex: number;
  fragment: Fragment;
}

export class TBRange {
  startIndex: number;
  endIndex: number;
  startFragment: Fragment;
  endFragment: Fragment;

  /**
   * 当前选区最近的公共 Fragment
   */
  get commonAncestorFragment() {
    return this.getCommonAncestorFragment();
  }

  get commonAncestorTemplate() {
    return this.getCommonAncestorTemplate();
  }

  /**
   * 当前选区是否折叠
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
      if (nativeRange.startContainer.nodeType === 3) {
        this.startIndex = renderer.getPositionByNode(nativeRange.startContainer).startIndex + nativeRange.startOffset;
      } else if (nativeRange.startContainer.nodeType === 1) {
        this.startIndex = this.getOffset(nativeRange.startContainer as HTMLElement, nativeRange.startOffset, this.startFragment);
      }
      if (nativeRange.endContainer.nodeType === 3) {
        this.endIndex = renderer.getPositionByNode(nativeRange.endContainer).startIndex + nativeRange.endOffset;
      } else if (nativeRange.endContainer.nodeType === 1) {
        this.endIndex = this.getOffset(nativeRange.endContainer as HTMLElement, nativeRange.endOffset, this.endFragment);
      }
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
    const commonAncestorFragment = this.commonAncestorFragment;

    let startChildTemplate: BackboneTemplate | BranchTemplate = null;
    let endChildTemplate: BackboneTemplate | BranchTemplate = null;

    while (startFragment !== commonAncestorFragment) {
      startChildTemplate = this.renderer.getParentTemplateByFragment(startFragment);
      startFragment = this.renderer.getParentFragmentByTemplate(startChildTemplate);
      startIndex = startFragment.indexOf(startChildTemplate);
    }

    while (endFragment !== commonAncestorFragment) {
      endChildTemplate = this.renderer.getParentTemplateByFragment(endFragment);
      endFragment = this.renderer.getParentFragmentByTemplate(endChildTemplate);
      endIndex = endFragment.indexOf(endChildTemplate);
    }

    return {
      startIndex,
      startFragment,
      startChildTemplate,
      endIndex,
      endFragment,
      endChildTemplate
    }
  }

  getSlotRange<T extends BackboneTemplate>(of: Constructor<T>, filter?: (instance: T) => boolean): Array<{ template: T; startIndex: number; endIndex: number }> {
    const maps: Array<{ template: T, index: number }> = [];
    this.getSelectedScope().map(scope => {
      const context = this.renderer.getContext(scope.fragment, of, filter);
      const index = context.childSlots.indexOf(scope.fragment)
      if (index !== -1) {
        maps.push({
          template: context,
          index
        })
      }
    });
    const templates: T[] = [];
    const rangeMark = new Map<T, { startIndex: number; endIndex: number }>();
    maps.forEach(item => {
      if (!templates.includes(item.template)) {
        templates.push(item.template);
        rangeMark.set(item.template, {startIndex: item.index, endIndex: item.index + 1})
      } else {
        rangeMark.get(item.template).endIndex = item.index + 1;
      }
    });

    return templates.map(t => {
      return {
        template: t,
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

  getExpandedScope(): TBRangeScope[] {
    return this.getScopes(this.startFragment,
      this.endFragment,
      TBRange.findExpandedStartIndex(this.startFragment, this.startIndex),
      TBRange.findExpandedEndIndex(this.endFragment, this.endIndex));
  }

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
        if (c instanceof BranchTemplate) {
          newScope = null;
          scopes.push(...fn(c.slot, 0, c.slot.contentLength));
        } else if (c instanceof BackboneTemplate) {
          newScope = null;
          c.childSlots.forEach(childFragment => {
            scopes.push(...fn(childFragment, 0, childFragment.contentLength));
          })
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

  deleteSelectedScope() {
    this.getSelectedScope().reverse().forEach(scope => {
      if (scope.startIndex === 0 && scope.endIndex === scope.fragment.contentLength) {
        scope.fragment.delete(0);
        if (scope.fragment !== this.startFragment && scope.fragment !== this.endFragment) {
          this.deleteEmptyTree(scope.fragment);
        }
      } else {
        scope.fragment.delete(scope.startIndex, scope.endIndex - scope.startIndex);
      }
    });
    return this;
  }

  deleteEmptyTree(fragment: Fragment, endFragment?: Fragment): TBRange {
    if (fragment === endFragment) {
      return this;
    }
    const parentTemplate = this.renderer.getParentTemplateByFragment(fragment);
    if (parentTemplate instanceof BranchTemplate) {
      const parentFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      parentFragment.delete(parentFragment.indexOf(parentTemplate), 1);
      if (parentFragment.contentLength === 0) {
        return this.deleteEmptyTree(parentFragment, endFragment);
      }
    } else if (parentTemplate instanceof BackboneTemplate) {
      parentTemplate.childSlots.splice(parentTemplate.childSlots.indexOf(fragment), 1);
      if (parentTemplate.childSlots.length === 0) {
        const parentFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
        const index = parentFragment.indexOf(parentTemplate);
        parentFragment.delete(index, 1);
        if (parentFragment.contentLength === 0) {
          return this.deleteEmptyTree(parentFragment, endFragment);
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
      if (prev instanceof BranchTemplate) {
        return this.findLastChild(prev.slot);
      }
      if (prev instanceof BackboneTemplate) {
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
      if (parentTemplate instanceof BackboneTemplate) {
        const fragmentIndex = parentTemplate.childSlots.indexOf(fragment);
        if (fragmentIndex > 0) {
          return this.findLastChild(parentTemplate.childSlots[fragmentIndex - 1]);
        }
      }
      const parentFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      const templateIndex = parentFragment.indexOf(parentTemplate);
      if (templateIndex > 0) {
        const prevContent = parentFragment.getContentAtIndex(templateIndex - 1);
        if (prevContent instanceof BranchTemplate) {
          return this.findLastChild(prevContent.slot);
        }
        if (prevContent instanceof BackboneTemplate) {
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
      if (current instanceof LeafTemplate && current.tagName === 'br') {
        offset++;
      }
    }
    if (offset < fragment.contentLength) {
      const next = fragment.getContentAtIndex(offset + 1);
      if (next instanceof BranchTemplate) {
        return this.findFirstPosition(next.slot);
      }
      if (next instanceof BackboneTemplate) {
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
      if (parentTemplate instanceof BackboneTemplate) {
        const fragmentIndex = parentTemplate.childSlots.indexOf(fragment);
        if (fragmentIndex < parentTemplate.childSlots.length - 1) {
          return this.findFirstPosition(parentTemplate.childSlots[fragmentIndex + 1]);
        }
      }
      const parentFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      const templateIndex = parentFragment.indexOf(parentTemplate);
      if (templateIndex < parentFragment.contentLength - 1) {
        const nextContent = parentFragment.getContentAtIndex(templateIndex + 1);
        if (nextContent instanceof BranchTemplate) {
          return this.findFirstPosition(nextContent.slot);
        }
        if (nextContent instanceof BackboneTemplate) {
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
   * @param startLeft
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
   * 获取选区向下移动一行的位置
   * @param startLeft
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

  findFirstPosition(fragment: Fragment): TBRangePosition {
    const first = fragment.getContentAtIndex(0);
    if (first instanceof BranchTemplate) {
      return this.findFirstPosition(first.slot);
    }
    if (first instanceof BackboneTemplate) {
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
    if (last instanceof BranchTemplate) {
      return this.findLastChild(last.slot);
    }
    if (last instanceof BackboneTemplate) {
      const lastFragment = last.childSlots[last.childSlots.length - 1];
      return this.findLastChild(lastFragment);
    }
    return {
      index: last instanceof LeafTemplate && last.tagName === 'br' ?
        fragment.contentLength - 1 :
        fragment.contentLength,
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
    if (this.startFragment === this.endFragment) {
      this.deleteSelectedScope();
    } else {
      let isDeleteFragment = false;
      if (this.startIndex === 0) {
        const {fragment, index} = this.findFirstPosition(this.startFragment);
        isDeleteFragment = fragment === this.startFragment && index === this.startIndex;
      }

      this.deleteSelectedScope();
      if (isDeleteFragment) {
        this.deleteEmptyTree(this.startFragment);
        this.setStart(this.endFragment, 0);
      } else {
        const last = this.endFragment.delete(0);
        this.deleteEmptyTree(this.endFragment);
        const startIndex = this.startFragment.contentLength;
        last.contents.forEach(c => this.startFragment.append(c));
        last.formatRanges
          .filter(f => !(f.renderer instanceof BlockFormatter))
          .map(f => {
            f.startIndex += startIndex;
            f.endIndex += startIndex;
            return f;
          })
          .forEach(f => this.startFragment.apply(f));
      }
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

  private getScopes(startFragment: Fragment,
                    endFragment: Fragment,
                    startIndex: number,
                    endIndex: number): TBRangeScope[] {
    const start: TBRangeScope[] = [];
    const end: TBRangeScope[] = [];
    let startParentTemplate: BackboneTemplate | BranchTemplate = null;
    let endParentTemplate: BackboneTemplate | BranchTemplate = null;

    let startFragmentPosition: number = null;
    let endFragmentPosition: number = null;

    const commonAncestorTemplate = this.commonAncestorTemplate;

    while (startFragment !== this.commonAncestorFragment) {
      if (commonAncestorTemplate && startParentTemplate === this.commonAncestorTemplate) {
        return;
      }
      start.push({
        startIndex,
        endIndex: startFragment.contentLength,
        fragment: startFragment
      });

      startParentTemplate = this.renderer.getParentTemplateByFragment(startFragment);
      if (startParentTemplate instanceof BackboneTemplate) {
        const childSlots = startParentTemplate.childSlots;
        const end = childSlots.indexOf(this.endFragment);
        startFragmentPosition = childSlots.indexOf(startFragment);
        if (startParentTemplate !== this.commonAncestorTemplate && end === -1) {
          start.push(...childSlots.slice(startFragmentPosition + 1, childSlots.length).map(fragment => {
            return {
              startIndex: 0,
              endIndex: fragment.contentLength,
              fragment
            }
          }));
        }
      }
      startFragment = this.renderer.getParentFragmentByTemplate(startParentTemplate);
      startIndex = startFragment.indexOf(startParentTemplate) + 1;
    }
    while (endFragment !== this.commonAncestorFragment) {
      if (commonAncestorTemplate && endParentTemplate === this.commonAncestorTemplate) {
        return;
      }
      endParentTemplate = this.renderer.getParentTemplateByFragment(endFragment);
      if (endParentTemplate instanceof BackboneTemplate) {
        const childSlots = endParentTemplate.childSlots;
        const start = childSlots.indexOf(this.startFragment);

        endFragmentPosition = childSlots.indexOf(endFragment);
        if (endParentTemplate !== this.commonAncestorTemplate && start === -1) {
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
      endFragment = this.renderer.getParentFragmentByTemplate(endParentTemplate);
      endIndex = endFragment.indexOf(endParentTemplate);
    }
    let result: TBRangeScope[] = [...start];
    if (startParentTemplate === endParentTemplate && startParentTemplate instanceof BackboneTemplate) {
      const slots = startParentTemplate.childSlots.slice(startFragmentPosition + 1, endFragmentPosition);
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
    let startTemplate = this.renderer.getParentTemplateByFragment(this.startFragment);
    let endTemplate = this.renderer.getParentTemplateByFragment(this.endFragment);
    if (startTemplate === endTemplate) {
      return startTemplate;
    }
    const startPaths: Template[] = [];
    const endPaths: Template[] = [];

    while (startTemplate) {
      startPaths.push(startTemplate);
      const parentFragment = this.renderer.getParentFragmentByTemplate(startTemplate);
      if (!parentFragment) {
        break;
      }
      startTemplate = this.renderer.getParentTemplateByFragment(parentFragment);
    }

    while (endTemplate) {
      endPaths.push(endTemplate);
      const parentFragment = this.renderer.getParentFragmentByTemplate(endTemplate);
      if (!parentFragment) {
        break;
      }
      endTemplate = this.renderer.getParentTemplateByFragment(parentFragment);
    }
    let f: Template = null;
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
                if (afterContent instanceof BranchTemplate || afterContent instanceof BackboneTemplate) {
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
      if (item instanceof BackboneTemplate || item instanceof BranchTemplate) {
        break;
      }
    }
    return index;
  }

  private static findExpandedEndIndex(fragment: Fragment, index: number) {
    for (; index < fragment.contentLength; index++) {
      const item = fragment.getContentAtIndex(index);
      if (item instanceof BackboneTemplate || item instanceof BranchTemplate) {
        break;
      }
    }
    return index;
  }
}
