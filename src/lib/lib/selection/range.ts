import { Fragment } from '../parser/fragment';
import { VirtualElementNode, VirtualNode } from '../parser/virtual-dom';
import { VIRTUAL_NODE, FRAGMENT_CONTEXT } from '../parser/help';

export class TBRange {
  startIndex: number;
  endIndex: number;
  commonAncestorFragment: Fragment;
  startFragment: Fragment;
  endFragment: Fragment;

  constructor(private range: Range) {
    this.startIndex = TBRange.getIndex(range.startContainer) + range.startOffset;

    this.endIndex = TBRange.getIndex(range.endContainer) + range.endOffset;
    this.startFragment = (range.startContainer[VIRTUAL_NODE] as VirtualElementNode[])[0].formatRange.context;
    this.endFragment = (range.endContainer[VIRTUAL_NODE] as VirtualElementNode[])[0].formatRange.context;
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
      if (index >= item.formatRange.startIndex && index <= item.formatRange.endIndex) {
        if (item instanceof VirtualElementNode) {
          return this.findPosition(item.children, index);
        } else if (item instanceof VirtualNode) {
          return {
            node: item.elementRef,
            position: index - item.formatRange.startIndex
          };
        }
      }
    }
  }

  private static getIndex(node: Node): number {
    return (node[VIRTUAL_NODE] as VirtualNode[])[0].formatRange.startIndex
  }

  private static getCommonFragment(node: Node): Fragment {
    while (node) {
      if (node[FRAGMENT_CONTEXT]) {
        return node[FRAGMENT_CONTEXT];
      }
      node = node.parentNode;
    }
    return null;
  }
}
