import { Contents, Sliceable } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { VirtualDom, VirtualNode } from './virtual-dom';
import { SingleNode } from './single-node';
import { FORMAT_TREE, FRAGMENT_CONTEXT } from './help';

export class FormatRange {
  get length() {
    return this.endIndex - this.startIndex || 0;
  }

  constructor(public startIndex: number,
              public endIndex: number,
              public state: MatchState,
              public handler: Handler,
              public context: Fragment) {
  }

  clone() {
    return new FormatRange(this.startIndex, this.endIndex, this.state, this.handler, this.context);
  }
}

export class Fragment implements Sliceable {
  elementRef: HTMLElement;

  get length() {
    return this.contents.length;
  }

  contents = new Contents();
  formatMatrix = new Map<Handler, FormatRange[]>();

  constructor(public tagName = 'p', public parent: Fragment) {
  }

  apply(format: FormatRange) {
    this.mergeFormat(format);
  }

  slice(startIndex: number, endIndex: number): Sliceable {
    return this.contents.slice(startIndex, endIndex);
  }

  render() {
    const dom = document.createElement(this.tagName);
    this.elementRef = dom;

    let formats: FormatRange[] = [];
    // 检出所有生效规则
    this.formatMatrix.forEach(value => {
      formats = formats.concat(value);
    });
    // 排序所有生效规则并克隆副本，防止修改原始数据，影响第二次变更检测
    const canApplyFormats = formats.sort((n, m) => {
      const a = n.startIndex - m.startIndex;
      if (a === 0) {
        return m.endIndex - n.endIndex;
      }
      return a;
    }).map(item => item.clone());

    const virtualNodeTree = new VirtualDom(canApplyFormats).build(this.contents);
    // let index = 0;
    // for (const fragment of this.contents) {
    //   if (typeof fragment === 'string') {
    //
    //     const fragmentStartIndex = index;
    //     const fragmentEndIndex = fragmentStartIndex + fragment.length;
    //
    //     const formatTreeList = virtualNodeTree.filter(format => {
    //       return format.formatRange.startIndex >= fragmentStartIndex &&
    //         format.formatRange.endIndex <= fragmentEndIndex;
    //     });
    //     this.makeDomNode(formatTreeList, fragment, null).forEach(node => {
    //       dom.appendChild(node);
    //     });
    //   } else if (fragment instanceof Fragment || fragment instanceof SingleNode) {
    //     const childNode = fragment.render();
    //     dom.appendChild(childNode);
    //   }
    // }
    // (dom as any)[FRAGMENT_CONTEXT] = this;
    return dom;
  }

  makeDomNode(virtualNodeTreeList: VirtualNode[], content: string, parentFormat: VirtualNode): Node[] {
    const nodes: Node[] = [];
    let start = 0;
    let end = content.length;
    while (start < content.length) {
      const virtualNode = virtualNodeTreeList.shift();
      if (virtualNode) {
        if (virtualNode.formatRange.startIndex > start) {
          const txt = content.slice(start, virtualNode.formatRange.startIndex);
          const newNode = document.createTextNode(txt);
          const vNode = new VirtualNode(
            new FormatRange(start, txt.length, null, null, this),
            parentFormat
          );
          vNode.elementRef = newNode;
          (newNode as any)[FORMAT_TREE] = vNode;
          (newNode as any)[FRAGMENT_CONTEXT] = this;
          nodes.push(newNode);
          start = virtualNode.formatRange.startIndex;
        }
        end = virtualNode.formatRange.endIndex;
        const str = content.slice(start, end);
        start = end;
        const parent = virtualNode.formatRange.handler.execCommand.render(
          virtualNode.formatRange.state,
          virtualNode.formatRange.context
        );
        if (parent) {
          (parent as any)[FORMAT_TREE] = virtualNode;
          (parent as any)[FRAGMENT_CONTEXT] = this;
          virtualNode.elementRef = parent;
          nodes.push(parent);
          this.makeDomNode(virtualNode.children, str, virtualNode).forEach(child => {
            parent.appendChild(child)
          });
        } else {
          this.makeDomNode(virtualNode.children, str, virtualNode).forEach(child => {
            nodes.push(child);
          });
        }
      } else {
        const txt = content.slice(start, content.length);
        const newNode = document.createTextNode(txt);
        const vNode = new VirtualNode(
          new FormatRange(start, txt.length, null, null, this),
          parentFormat
        );
        (newNode as any)[FORMAT_TREE] = vNode;
        (newNode as any)[FRAGMENT_CONTEXT] = this;
        vNode.elementRef = newNode;
        nodes.push(newNode);
        start = content.length;
      }
    }
    return nodes.reduce((result, next) => {
      const last = result[result.length - 1];
      if (last && last.nodeType === 3 && next.nodeType === 3) {
        last.textContent = last.textContent + next.textContent;
        ((last as any)[FORMAT_TREE] as VirtualNode).formatRange.endIndex = last.textContent.length;
      } else {
        result.push(next);
      }
      return result;
    }, [] as Node[]);
  }

  mergeFormat(format: FormatRange) {
    const oldFormats = this.formatMatrix.get(format.handler);
    let formatRanges: FormatRange[] = [];

    if (oldFormats) {
      const styleMarks: MatchState[] = [];
      oldFormats.push(format);
      let index = oldFormats.length - 1;
      while (index >= 0) {
        const item = oldFormats[index];
        if (styleMarks.length < item.endIndex) {
          styleMarks.length = item.endIndex;
        }
        styleMarks.fill(item.state, item.startIndex, item.endIndex);
        index--;
      }
      let newFormatRange: FormatRange = null;
      for (let i = 0; i < styleMarks.length; i++) {
        const mark = styleMarks[i];

        if (!mark) {
          continue;
        }
        if (!newFormatRange) {
          newFormatRange = new FormatRange(i, i + 1, mark, format.handler, this);
          formatRanges.push(newFormatRange);
          continue;
        }
        if (mark === newFormatRange.state) {
          newFormatRange.endIndex = i + 1;
        } else {
          newFormatRange = new FormatRange(i, i + 1, mark, format.handler, this);
          formatRanges.push(newFormatRange);
        }
      }
    } else {
      formatRanges.push(format);
    }
    this.formatMatrix.set(format.handler, formatRanges);
  }
}
