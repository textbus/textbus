import { Renderer } from './renderer';
import { Fragment } from './fragment';
import { VElement } from './element';
import { Template } from './template';

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

  startFragment: Fragment;
  endFragment: Fragment;

  /**
   * 当前选区是否折叠
   */
  get collapsed() {
    return this.startFragment === this.commonAncestorFragment &&
      this.endFragment === this.commonAncestorFragment &&
      this.startIndex === this.endIndex;
  }

  readonly commonAncestorFragment: Fragment;
  readonly commonAncestorTemplate: Template;

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
      const position = renderer.getPositionByNode(nativeRange.commonAncestorContainer);
      this.commonAncestorFragment = position.fragment;
      if (position.endIndex - position.startIndex === 1) {
        this.commonAncestorTemplate = position.fragment.sliceContents(
          position.startIndex,
          position.endIndex)[0] as Template;
      } else {
        this.commonAncestorTemplate = this.renderer.getParentTemplateByFragment(position.fragment);
      }
    }
  }

  restore() {
    const start = this.findFocusNodeAndOffset(this.startFragment, this.startIndex);
    const end = this.findFocusNodeAndOffset(this.endFragment, this.endIndex);
    this.nativeRange.setStart(start.node, start.offset);
    this.nativeRange.setEnd(end.node, end.offset);
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
      startIndex = startFragment.find(parentTemplate);
    }

    while (endFragment !== this.commonAncestorFragment) {
      const parentTemplate = this.renderer.getParentTemplateByFragment(endFragment);
      endFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      endIndex = endFragment.find(parentTemplate);
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
      startIndex = startFragment.find(parentTemplate) + 1;
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
      endIndex = endFragment.find(parentTemplate);
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
      startIndex = startFragment.find(parentTemplate) + 1;
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
      endIndex = endFragment.find(parentTemplate);
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
    this.getSelectedScope().forEach(scope => {
      if (scope.startIndex === 0 && scope.endIndex === scope.fragment.contentLength) {
        this.deleteEmptyTree(scope.fragment);
      } else {
        scope.fragment.delete(scope.startIndex, scope.endIndex - scope.startIndex);
      }
    })
  }

  deleteEmptyTree(fragment: Fragment) {
    const parentTemplate = this.renderer.getParentTemplateByFragment(fragment);
    parentTemplate.childSlots.splice(parentTemplate.childSlots.indexOf(fragment), 1);
    if (parentTemplate.childSlots.length === 0) {
      const parentFragment = this.renderer.getParentFragmentByTemplate(parentTemplate);
      const index = parentFragment.find(parentTemplate);
      parentFragment.delete(index, 1);
      if (parentFragment.contentLength === 0) {
        this.deleteEmptyTree(parentFragment);
      }
    }
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
