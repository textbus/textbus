import { Fragment } from '../parser/fragment';
import { TBUS_TOKEN } from '../parser/help';
import { BlockToken, InlineToken, MediaToken, Token, TextToken } from '../renderer/tokens';
import { NativeNode } from '../renderer/renderer';

export interface TBRangePosition {
  fragment: Fragment;
  index: number;
}

export interface SelectedScope {
  startIndex: number;
  endIndex: number;
  context: Fragment;
}

export class TBRange {
  startIndex: number;
  endIndex: number;

  get startFragment() {
    return this._startFragment;
  }

  set startFragment(v: Fragment) {
    this._startFragment = v;
    this._commonAncestorFragment = TBRange.getCommonFragment(v, this.endFragment);
  }

  get endFragment() {
    return this._endFragment;
  }

  set endFragment(v: Fragment) {
    this._endFragment = v;
    this._commonAncestorFragment = TBRange.getCommonFragment(this.startFragment, v);
  }

  get commonAncestorFragment() {
    return this._commonAncestorFragment;
  }

  get collapsed() {
    return this.startFragment === this.commonAncestorFragment &&
      this.endFragment === this.commonAncestorFragment &&
      this.startIndex === this.endIndex;
  }

  private _commonAncestorFragment: Fragment;
  private _startFragment: Fragment;
  private _endFragment: Fragment;

  constructor(public nativeRange: Range) {
    if ([1, 3].includes(nativeRange.commonAncestorContainer.nodeType)) {

      if (nativeRange.startContainer.nodeType === 3) {
        this.startIndex = TBRange.getIndex(nativeRange.startContainer) + nativeRange.startOffset;
      } else if (nativeRange.startContainer.nodeType === 1) {
        this.startIndex = TBRange.getOffset(nativeRange.startContainer, nativeRange.startOffset);
      }
      if (nativeRange.endContainer.nodeType === 3) {
        this.endIndex = TBRange.getIndex(nativeRange.endContainer) + nativeRange.endOffset;
      } else if (nativeRange.endContainer.nodeType === 1) {
        this.endIndex = TBRange.getOffset(nativeRange.endContainer, nativeRange.endOffset);
      }

      this.startFragment = (nativeRange.startContainer[TBUS_TOKEN] as Token).context;
      this.endFragment = (nativeRange.endContainer[TBUS_TOKEN] as Token).context;
    }
  }

  clone() {
    const r = new TBRange(this.nativeRange.cloneRange());
    Object.assign(r, this);
    return r;
  }

  apply(offset = 0) {
    const start = this.findFocusNodeAndOffset(
      this.startFragment.token.children,
      this.startIndex + offset);
    const end = this.findFocusNodeAndOffset(
      this.endFragment.token.children,
      this.endIndex + offset);
    this.startIndex += offset;
    this.endIndex += offset;

    this.nativeRange.setStart(start.node as Node, start.offset);
    this.nativeRange.setEnd(end.node as Node, end.offset);
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
      startIndex += startFragment.getIndexInParent();
      startFragment = startFragment.parent;
    }

    while (endFragment !== this.commonAncestorFragment) {
      endIndex += endFragment.getIndexInParent();
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
        endIndex: startFragment.contentLength,
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
    }).reduce((previousValue, currentValue) => {
      return previousValue.concat(this.contentsToBlockRange(
        currentValue.context,
        currentValue.startIndex,
        currentValue.endIndex));
    }, []);
  }

  private static findBlockStartIndex(fragment: Fragment, index: number) {
    let startIndex: number = 0;
    for (let i = 0; i < index; i++) {
      const item = fragment.getContentAtIndex(i);
      if (item instanceof Fragment) {
        startIndex = i + 1;
      }
    }
    return startIndex;
  }

  private static findBlockEndIndex(fragment: Fragment, index: number) {
    for (; index < fragment.contentLength; index++) {
      const item = fragment.getContentAtIndex(index);
      if (item instanceof Fragment) {
        break;
      }
    }
    return index;
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
            context: fragment
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

  private findFocusNodeAndOffset(vNodes: Token[],
                                 i: number): { node: NativeNode, offset: number } {
    let endIndex = 0;
    for (let index = 0; index < vNodes.length; index++) {
      const item = vNodes[index];
      if ((item instanceof BlockToken || item instanceof InlineToken) && item.context.token === item) {
        if (endIndex === i) {
          const childNodes = Array.from(item.nativeElement.parentNode.childNodes);
          const index = childNodes.indexOf(item.nativeElement as ChildNode);
          return {
            node: item.nativeElement.parentNode,
            offset: index
          }
        }
        endIndex++;
        continue;
      }
      endIndex = item.endIndex;

      const toEnd = i === item.endIndex && index === vNodes.length - 1;
      if (i >= item.startIndex && i < item.endIndex || toEnd) {
        if (item instanceof InlineToken || item instanceof BlockToken) {
          if (item.children.length) {
            return this.findFocusNodeAndOffset(item.children, i);
          }
          return {
            node: item.nativeElement,
            offset: i
          }
        } else if (item instanceof MediaToken) {
          const index = Array.from(item.nativeElement.parentNode.childNodes).indexOf(item.nativeElement as ChildNode);
          return {
            node: item.nativeElement.parentNode,
            offset: toEnd ? index + 1 : index
          }
        } else if (item instanceof TextToken) {
          return {
            node: item.nativeElement,
            offset: i - item.startIndex
          };
        }
      }
    }
    const last = vNodes[vNodes.length - 1];
    const childNodes = Array.from(last.nativeElement.parentNode.childNodes);
    const index = childNodes.indexOf(last.nativeElement as ChildNode);
    return {
      node: last.nativeElement.parentNode,
      offset: index + 1
    };
  }

  private static getIndex(node: Node): number {
    return (node[TBUS_TOKEN] as Token).startIndex
  }

  private static getOffset(node: Node, offset: number) {
    if (node.nodeType === 1) {
      if (node.childNodes.length === offset) {
        return (node[TBUS_TOKEN] as Token).context.contentLength;
      }
      const childVNode = (node.childNodes[offset][TBUS_TOKEN] as Token);
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
