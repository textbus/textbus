import { Fragment } from '../parser/fragment';
import { VirtualContainerNode, VirtualNode, VirtualObjectNode } from '../parser/virtual-dom';
import { VIRTUAL_NODE } from '../parser/help';

export interface SelectedScope {
  startIndex: number;
  endIndex: number;
  context: Fragment;
}

export class TBRange {
  startIndex: number;
  endIndex: number;
  startFragment: Fragment;
  endFragment: Fragment;

  get commonAncestorFragment() {
    return TBRange.getCommonFragment(this.startFragment, this.endFragment);
  }

  get collapsed() {
    return this.startFragment === this.commonAncestorFragment &&
      this.endFragment === this.commonAncestorFragment &&
      this.startIndex === this.endIndex;
  }

  constructor(public rawRange: Range) {
    if (rawRange.startContainer.nodeType === 3) {
      this.startIndex = TBRange.getIndex(rawRange.startContainer) + rawRange.startOffset;
    } else if (rawRange.startContainer.nodeType === 1) {
      this.startIndex = TBRange.getIndex(rawRange.startContainer) +
        TBRange.getOffset(rawRange.startContainer, rawRange.startOffset);
    }
    if (rawRange.endContainer.nodeType === 3) {
      this.endIndex = TBRange.getIndex(rawRange.endContainer) + rawRange.endOffset;
    } else if (rawRange.endContainer.nodeType === 1) {
      this.endIndex = TBRange.getIndex(rawRange.endContainer) +
        TBRange.getOffset(rawRange.endContainer, rawRange.endOffset);
    }

    this.startFragment = (rawRange.startContainer[VIRTUAL_NODE] as VirtualNode).context;
    this.endFragment = (rawRange.endContainer[VIRTUAL_NODE] as VirtualNode).context;
  }

  clone() {
    const r = new TBRange(this.rawRange);
    Object.assign(r, this);
    return r;
  }

  apply(offset = 0) {
    const start = this.findFocusNodeAndOffset(
      this.startFragment.virtualNode.children,
      this.startIndex + offset);
    const end = this.findFocusNodeAndOffset(
      this.endFragment.virtualNode.children,
      this.endIndex + offset);
    this.startIndex += offset;
    this.endIndex += offset;
    this.rawRange.setStart(start.node, start.offset);
    this.rawRange.setEnd(end.node, end.offset);
  }

  collapse(toEnd = false) {
    if (toEnd) {
      this.startIndex = this.endIndex;
      this.startFragment = this.endFragment;
    } else {
      this.endFragment = this.startFragment;
      this.endIndex = this.startIndex;
    }
  }

  getCommonAncestorContentsScope() {
    let startFragment = this.startFragment;
    let endFragment = this.endFragment;
    let startIndex = this.startIndex;
    let endIndex = this.endIndex;

    while (startFragment !== this.commonAncestorFragment) {
      startIndex += startFragment.parent.contents.getIndexByNode(startFragment);
      startFragment = startFragment.parent;
    }

    while (endFragment !== this.commonAncestorFragment) {
      endIndex += endFragment.parent.contents.getIndexByNode(endFragment);
      endFragment = endFragment.parent;
    }

    return {
      startIndex,
      endIndex
    }
  }

  getCommonAncestorFragmentScope() {
    let startFragment = this.startFragment;
    let endFragment = this.endFragment;
    let startIndex = this.startIndex;
    let endIndex = this.endIndex;

    while (startFragment !== this.commonAncestorFragment) {
      startIndex = startFragment.getIndexInParent();
      startFragment = startFragment.parent;
    }

    while (endFragment !== this.commonAncestorFragment) {
      endIndex = endFragment.getIndexInParent();
      endFragment = endFragment.parent;
    }

    return {
      startIndex,
      endIndex
    }
  }

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
        startIndex, endIndex, context: startFragment
      }];
    }

    while (startFragment !== this.commonAncestorFragment) {
      start.push({
        startIndex,
        endIndex: startFragment.contents.length,
        context: startFragment
      });
      startIndex = startFragment.getIndexInParent() + 1;
      startFragment = startFragment.parent;
    }
    while (endFragment !== this.commonAncestorFragment) {
      end.push({
        startIndex: 0,
        endIndex,
        context: endFragment
      });
      endIndex = endFragment.getIndexInParent();
      endFragment = endFragment.parent;
    }
    return [...start, {
      startIndex,
      endIndex,
      context: this.commonAncestorFragment
    }, ...end].filter(item => {
      return item.startIndex < item.endIndex
    });
  }

  private findFocusNodeAndOffset(vNodes: VirtualNode[],
                                 i: number): { node: Node, offset: number } {
    for (let index = 0; index < vNodes.length; index++) {
      const item = vNodes[index];
      const toEnd = i === item.endIndex && index === vNodes.length - 1;
      if (i >= item.startIndex && i < item.endIndex || toEnd) {
        if (item instanceof VirtualContainerNode) {
          if (item.children.length) {
            return this.findFocusNodeAndOffset(item.children, i);
          }
          return {
            node: item.elementRef,
            offset: i
          }
        } else if (item instanceof VirtualObjectNode) {
          const index = Array.from(item.elementRef.parentNode.childNodes).indexOf(item.elementRef as ChildNode);
          return {
            node: item.elementRef.parentNode,
            offset: toEnd ? index + 1 : index
          }
        } else if (item instanceof VirtualNode) {
          return {
            node: item.elementRef,
            offset: i - item.startIndex
          };
        }
      }
    }
  }

  private static getIndex(node: Node): number {
    return (node[VIRTUAL_NODE] as VirtualNode).startIndex
  }

  private static getOffset(node: Node, offset: number) {
    if (node.nodeType === 1) {
      if (node.childNodes.length === offset) {
        return (node[VIRTUAL_NODE] as VirtualNode).context.contents.length;
      }
      const childVNode = (node.childNodes[offset][VIRTUAL_NODE] as VirtualNode);
      return childVNode.startIndex;
    }
    return offset;
  }

  private static getCommonFragment(startFragment: Fragment, endFragment: Fragment): Fragment {
    if (startFragment === endFragment) {
      return startFragment;
    }

    const startPaths: Fragment[] = [];
    const endPaths: Fragment[] = [];

    while (startFragment) {
      startPaths.push(startFragment);
      startFragment = startFragment.parent;
    }

    while (endFragment) {
      endPaths.push(endFragment);
      endFragment = endFragment.parent;
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
}
