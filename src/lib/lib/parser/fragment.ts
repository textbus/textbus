import { Contents } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { VirtualElementNode, VirtualNode } from './virtual-dom';
import { ViewNode } from './view-node';
import { FRAGMENT_CONTEXT, VIRTUAL_NODE } from './help';

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

export class Fragment extends ViewNode {
  elementRef: HTMLElement;

  contents = new Contents();
  formatMatrix = new Map<Handler, FormatRange[]>();

  children: VirtualNode[] = [];

  constructor(public tagName = 'p', public parent: Fragment) {
    super();
  }

  apply(format: FormatRange) {
    this.mergeFormat(format);
  }

  /**
   * 渲染 DOM
   */
  render() {
    const dom = document.createElement(this.tagName);
    dom[FRAGMENT_CONTEXT] = this;
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

    const vDom = this.createVDom(canApplyFormats);
    const r = this.viewBuilder(vDom, this.contents);
    this.children = r.newNodes;
    dom.appendChild(r.fragment);
    return dom;
  }

  /**
   * 合并当前片段的格式化信息
   * @param format
   */
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

  /**
   * 根据虚拟 DOM 树和内容生成真实 DOM
   * @param vNode
   * @param contents
   */
  private viewBuilder(vNode: VirtualNode, contents: Contents) {
    const fragment = document.createDocumentFragment();
    const newNodes: VirtualNode[] = [];
    if (vNode instanceof VirtualElementNode) {
      let container: DocumentFragment | HTMLElement = fragment;
      if (vNode.formatRange.handler) {
        container = vNode.formatRange.handler.execCommand.render(vNode.formatRange.state);
        fragment.appendChild(container);
      }
      newNodes.push(vNode);
      const nodes: VirtualNode[] = [];
      vNode.children.forEach(vNode => {
        const r = this.viewBuilder(vNode, contents);
        container.appendChild(r.fragment);
        nodes.push(...r.newNodes);
      });
      vNode.children = nodes;
    } else {
      const c = contents.slice(vNode.formatRange.startIndex, vNode.formatRange.endIndex);
      let i = 0;
      c.forEach(item => {
        const newFormatRange = new FormatRange(
          i + vNode.formatRange.startIndex,
          item.length + vNode.formatRange.startIndex,
          null, null, vNode.formatRange.context);
        const v = new VirtualNode(newFormatRange, vNode.parent);
        newNodes.push(v);
        if (typeof item === 'string') {
          let currentNode = document.createTextNode(item);
          currentNode[VIRTUAL_NODE] = vNode;
          vNode.elementRef = currentNode;
          fragment.appendChild(currentNode);
        } else if (item instanceof ViewNode) {
          const container = item.render();
          fragment.appendChild(container);
        }
        i += item.length;
      });
    }

    return {
      fragment,
      newNodes
    };
  }

  /**
   * 根据可应用的格式化信息生成构建 dom 树所依赖的格式化树状数据结构
   * @param formatRanges 可应用的格式化数据
   */
  private createVDom(formatRanges: FormatRange[]) {
    const root = new VirtualElementNode(new FormatRange(0, this.contents.length, null, null, this), null);
    this.vDomBuilder(formatRanges,
      root,
      0,
      this.contents.length
    );
    return root;
  }

  /**
   * 根据格式化信息和范围生成树状数据结构，并把格式化信息未描述的区间设置为虚拟文本节点
   * @param formatRanges 格式化记录数据
   * @param parent 当前要生成树的父级
   * @param startIndex 生成范围的开始索引
   * @param endIndex 生成范围的结束位置
   */
  private vDomBuilder(formatRanges: FormatRange[], parent: VirtualElementNode, startIndex: number, endIndex: number) {
    while (startIndex < endIndex) {
      let firstRange = formatRanges.shift();
      if (firstRange) {
        if (startIndex < firstRange.startIndex) {
          const f = new FormatRange(startIndex, firstRange.startIndex, null, null, this);
          parent.children.push(new VirtualNode(f, parent));
        }
        const container = new VirtualElementNode(firstRange, parent);
        const childFormatRanges: FormatRange[] = [];
        while (true) {
          const f = formatRanges[0];
          if (f && f.endIndex <= firstRange.endIndex) {
            childFormatRanges.push(formatRanges.shift());
          } else {
            break;
          }
        }
        if (childFormatRanges.length) {
          this.vDomBuilder(childFormatRanges, container, startIndex, firstRange.endIndex);
        } else {
          const f = new FormatRange(firstRange.startIndex, firstRange.endIndex, null, null, this);
          container.children.push(new VirtualNode(f, parent))
        }
        parent.children.push(container);
        startIndex = firstRange.endIndex;
      } else {
        parent.children.push(new VirtualNode(new FormatRange(startIndex, endIndex, null, null, this), parent));
        break;
      }
    }
  }
}
