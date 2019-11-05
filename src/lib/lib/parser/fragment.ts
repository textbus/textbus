import { Contents, Sliceable } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { FormatTree } from './format-tree';
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
  get length() {
    return this.contents.length;
  }

  parent: Fragment = null;

  contents = new Contents();
  formatMatrix = new Map<Handler, FormatRange[]>();

  constructor(public tagName = 'p') {
  }

  apply(format: FormatRange) {
    this.mergeFormat(format);
    return this.render();
  }

  slice(startIndex: number, endIndex: number): Sliceable {
    return this.contents.slice(startIndex, endIndex);
  }

  render() {
    const dom = this.tagName === '#root' ? document.createDocumentFragment() : document.createElement(this.tagName);
    const formatTree = this.buildFormatTree();
    let index = 0;
    for (const fragment of this.contents) {
      if (typeof fragment === 'string') {

        const fragmentStartIndex = index;
        const fragmentEndIndex = fragmentStartIndex + fragment.length;

        const formatTreeList = formatTree.filter(format => {
          return format.formatRange.startIndex >= fragmentStartIndex &&
            format.formatRange.endIndex <= fragmentEndIndex;
        });
        this.makeDomNode(formatTreeList, fragment, null).forEach(node => {
          dom.appendChild(node);
        });
      } else if (fragment instanceof Fragment || fragment instanceof SingleNode) {
        const childNode = fragment.render();
        dom.appendChild(childNode);
      }
    }
    (dom as any)[FRAGMENT_CONTEXT] = this;
    return dom;
  }

  makeDomNode(formatTreeList: FormatTree[], content: string, parentFormat: FormatTree): Node[] {
    const nodes: Node[] = [];
    let start = 0;
    let end = content.length;
    while (start < content.length) {
      const format = formatTreeList.shift();
      if (format) {
        if (format.formatRange.startIndex > start) {
          const txt = content.slice(start, format.formatRange.startIndex);
          const newNode = document.createTextNode(txt);
          (newNode as any)[FORMAT_TREE] = new FormatTree(
            new FormatRange(start, txt.length, null, null, this),
            parentFormat
          );
          (newNode as any)[FRAGMENT_CONTEXT] = this;
          nodes.push(newNode);
          start = format.formatRange.startIndex;
        }
        end = format.formatRange.endIndex;
        const str = content.slice(start, end);
        start = end;
        const parent = format.formatRange.handler.execCommand.render(
          format.formatRange.state,
          format.formatRange.context
        );
        if (parent) {
          (parent as any)[FORMAT_TREE] = format;
          (parent as any)[FRAGMENT_CONTEXT] = this;
          nodes.push(parent);
          this.makeDomNode(format.children, str, format).forEach(child => {
            parent.appendChild(child)
          });
        } else {
          this.makeDomNode(format.children, str, format).forEach(child => {
            nodes.push(child);
          });
        }


      } else {
        const txt = content.slice(start, content.length);
        const newNode = document.createTextNode(txt);
        (newNode as any)[FORMAT_TREE] = new FormatTree(
          new FormatRange(start, txt.length, null, null, this),
          parentFormat
        );
        (newNode as any)[FRAGMENT_CONTEXT] = this;
        nodes.push(newNode);
        start = content.length;
      }
    }
    return nodes.reduce((result, next) => {
      const last = result[result.length - 1];
      if (last && last.nodeType === 3 && next.nodeType === 3) {
        last.textContent = last.textContent + next.textContent;
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

  private buildFormatTree(): Array<FormatTree> {
    let formats: FormatRange[] = [];
    // 检出所有生效规则
    this.formatMatrix.forEach(value => {
      formats = formats.concat(value);
    });
    // 排序所有生效规则并克隆副本，防止修改原始数据，影响第二次变更检测
    const canApplyStyles = formats.sort((n, m) => {
      const a = n.startIndex - m.startIndex;
      if (a === 0) {
        return m.endIndex - n.endIndex;
      }
      return a;
    }).map(item => item.clone());

    // 把扁平交叉的生效规则变更为嵌套虚拟 DOM 节点，方便渲染实际 DOM
    const tree: FormatTree[] = [];
    const depthTree: FormatTree[] = [];

    for (let i = 0; i < canApplyStyles.length; i++) {
      const item = canApplyStyles[i];
      let lastVDom = depthTree[depthTree.length - 1];
      if (lastVDom) {
        if (item.startIndex < lastVDom.formatRange.endIndex) {
          const newFormatRange = item.clone();
          if (lastVDom.formatRange.endIndex < newFormatRange.endIndex) {
            newFormatRange.endIndex = lastVDom.formatRange.endIndex;
            const len = newFormatRange.length;
            newFormatRange.endIndex = lastVDom.formatRange.length;
            newFormatRange.startIndex = newFormatRange.endIndex - len;
            const c = item.clone();
            c.startIndex = lastVDom.formatRange.endIndex;
            canApplyStyles[i] = c;
            i--;
          } else if (item.endIndex === lastVDom.formatRange.endIndex) {
            newFormatRange.startIndex = 0;
            newFormatRange.endIndex = lastVDom.formatRange.length;
          }
          const newNode = new FormatTree(newFormatRange, lastVDom);
          lastVDom.children.push(newNode);
          depthTree.push(newNode);
        } else {
          depthTree.pop();
          const newNode = new FormatTree(item, null);
          tree.push(newNode);
          depthTree.push(newNode);
        }
      } else {
        const newNode = new FormatTree(item, null);
        tree.push(newNode);
        depthTree.push(newNode);
      }
    }
    return tree;
  }
}
