import { Handler } from '../toolbar/handlers/help';
import { FormatRange, Fragment } from '../parser/fragment';
import { VirtualElementNode } from '../parser/virtual-dom';
import { VIRTUAL_NODE, FRAGMENT_CONTEXT } from '../parser/help';

export class TBRange {
  startIndex: number;
  endIndex: number;
  commonAncestorFragment: Fragment;
  startFragment: Fragment;
  endFragment: Fragment;
  formatMatrix = new Map<Handler, FormatRange>();

  constructor(private range: Range) {
    this.startIndex = TBRange.getIndex(range.startContainer) + range.startOffset;
    this.endIndex = TBRange.getIndex(range.endContainer) + range.endOffset;
    this.startFragment = (range.startContainer[VIRTUAL_NODE] as VirtualElementNode).formatRange.context;
    this.endFragment = (range.endContainer[VIRTUAL_NODE] as VirtualElementNode).formatRange.context;
    this.commonAncestorFragment = TBRange.getCommonFragment(range.commonAncestorContainer);
  }

  apply() {
    console.log(this)
  }

  private static getIndex(node: Node): number {
    let vNode: VirtualElementNode = node[VIRTUAL_NODE];
    let index = 0;
    while (vNode) {
      index += vNode.formatRange.startIndex;
      vNode = vNode.parent;
    }
    return index;
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
