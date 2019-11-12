import { Fragment } from '../parser/fragment';
import { VirtualContainerNode, VirtualNode } from '../parser/virtual-dom';
import { FRAGMENT_CONTEXT, VIRTUAL_NODE } from '../parser/help';

export class TBRange {
  startIndex: number;
  endIndex: number;
  commonAncestorFragment: Fragment;
  startFragment: Fragment;
  endFragment: Fragment;

  constructor(private range: Range) {
    this.startIndex = TBRange.getIndex(range.startContainer) + range.startOffset;

    this.endIndex = TBRange.getIndex(range.endContainer) + range.endOffset;
    this.startFragment = (range.startContainer[VIRTUAL_NODE] as VirtualNode).formats[0].context;
    this.endFragment = (range.endContainer[VIRTUAL_NODE] as VirtualNode).formats[0].context;
    this.commonAncestorFragment = TBRange.getCommonFragment(range.commonAncestorContainer);
  }

  apply() {
    const start = this.findPosition(
      this.startFragment.children,
      this.startIndex);
    const end = this.findPosition(
      this.endFragment.children,
      this.endIndex);
    this.range.setStart(start.node, start.position);
    this.range.setEnd(end.node, end.position);
  }

  private findPosition(vNodes: VirtualNode[],
                       index: number): { node: Node, position: number } {
    for (const item of vNodes) {
      if (index >= item.formats[0].startIndex && index <= item.formats[0].endIndex) {
        if (item instanceof VirtualContainerNode) {
          return this.findPosition(item.children, index);
        } else if (item instanceof VirtualNode) {
          return {
            node: item.elementRef,
            position: index - item.formats[0].startIndex
          };
        }
      }
    }
  }

  private static getIndex(node: Node): number {
    return (node[VIRTUAL_NODE] as VirtualNode).formats[0].startIndex
  }

  private static getCommonFragment(node: Node): Fragment {
    while (node) {
      const fragment = node[FRAGMENT_CONTEXT] as Fragment;
      if (fragment) {
        return fragment;
      }
      node = node.parentNode;
    }
    return null;
  }
}
