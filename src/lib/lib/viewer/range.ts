import { Renderer } from '../core/renderer';
import { Fragment } from '../core/fragment';

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
  commonAncestorFragment: Fragment;

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
      this.commonAncestorFragment = renderer.getPositionByNode(nativeRange.commonAncestorContainer).fragment;
    }
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

  private getOffset(node: Node, offset: number) {
    if (node.nodeType === 1) {
      if (node.childNodes.length === offset) {
        return this.renderer.getPositionByNode(node).fragment.contentLength;
      }
      return this.renderer.getPositionByNode(node.childNodes[offset]).startIndex;
    }
    return offset;
  }
}
