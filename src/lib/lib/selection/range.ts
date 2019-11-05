import { Handler } from '../toolbar/handlers/help';
import { FormatRange, Fragment } from '../parser/fragment';
import { FormatTree } from '../parser/format-tree';
import { FORMAT_TREE, FRAGMENT_CONTEXT } from '../parser/help';

export class TBRange {
  startIndex: number;
  endIndex: number;
  commonFragment: Fragment;
  startFragment: Fragment;
  endFragment: Fragment;
  formatMatrix = new Map<Handler, FormatRange>();

  constructor(private range: Range) {
    this.startIndex = TBRange.getIndex(range.startContainer) + range.startOffset;
    this.endIndex = TBRange.getIndex(range.endContainer) + range.endOffset;
    this.startFragment = range.startContainer[FRAGMENT_CONTEXT];
    this.endFragment = range.endContainer[FRAGMENT_CONTEXT];
    this.commonFragment = TBRange.getCommonFragment(range.commonAncestorContainer);
  }

  private static getIndex(node: Node): number {
    let formatTree: FormatTree = node[FORMAT_TREE];
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
