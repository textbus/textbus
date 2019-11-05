import { Handler } from '../toolbar/handlers/help';
import { FormatRange, Fragment } from '../parser/fragment';
import { VirtualNode } from '../parser/virtual-dom';
import { FORMAT_TREE, FRAGMENT_CONTEXT } from '../parser/help';

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
    this.startFragment = range.startContainer[FRAGMENT_CONTEXT];
    this.endFragment = range.endContainer[FRAGMENT_CONTEXT];
    this.commonAncestorFragment = TBRange.getCommonFragment(range.commonAncestorContainer);
  }

  apply() {

  }

  private static getIndex(node: Node): number {
    let formatTree: VirtualNode = node[FORMAT_TREE];
    let index = 0;
    while (formatTree) {
      index += formatTree.formatRange.startIndex;
      formatTree = formatTree.parent;
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
