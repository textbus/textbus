import { Fragment } from '../parser/fragment';
import { VirtualContainerNode, VirtualNode } from '../parser/virtual-dom';
import { VIRTUAL_NODE } from '../parser/help';

export interface SelectedScope {
  startIndex: number;
  endIndex: number;
  context: Fragment;
}

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
    this.commonAncestorFragment = TBRange.getCommonFragment(this.startFragment, this.endFragment);
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

  getSelectedScope(): SelectedScope[] {
    const start: SelectedScope[] = [];
    const end: SelectedScope[] = [];
    let startFragment = this.startFragment;
    let endFragment = this.endFragment;
    let startIndex = this.startIndex;
    let endIndex = this.endIndex;
    while (startFragment !== this.commonAncestorFragment) {
      start.push({
        startIndex,
        endIndex: startFragment.contents.length,
        context: startFragment
      });
      startIndex = startFragment.parent.contents.find(startFragment) + 1;
      startFragment = startFragment.parent;
    }
    while (endFragment !== this.commonAncestorFragment) {
      end.push({
        startIndex: 0,
        endIndex,
        context: endFragment
      });
      endIndex = endFragment.parent.contents.find(endFragment);
      endFragment = endFragment.parent;
    }
    return [...start, {
      startIndex,
      endIndex,
      context: this.commonAncestorFragment
    }, ...end];
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
