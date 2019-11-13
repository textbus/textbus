import { Contents } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { VirtualContainerNode, VirtualNode } from './virtual-dom';
import { ViewNode } from './view-node';
import { VIRTUAL_NODE } from './help';
import { ReplaceModel, ChildSlotModel } from '../commands/commander';

export class FormatRange {
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
  elements: Node[] = [];
  contents = new Contents();
  formatMatrix = new Map<Handler, FormatRange[]>();

  children: Array<VirtualNode | VirtualContainerNode> = [];

  constructor(public parent: Fragment) {
    super();
  }

  apply(format: FormatRange, canSurroundBlockElement = true) {
    if (canSurroundBlockElement) {
      this.mergeFormat(format, true);
    } else {

      const children = this.contents.slice(format.startIndex, format.endIndex);
      let index = 0;
      const formats: FormatRange[] = [];
      let childFormat: FormatRange;
      children.forEach(item => {
        if (item instanceof Fragment) {
          const c = format.clone();
          c.startIndex = 0;
          c.endIndex = item.contents.length;
          item.apply(c, canSurroundBlockElement);
        } else if (item) {
          if (!childFormat) {
            childFormat = new FormatRange(
              format.startIndex + index,
              format.startIndex + index + item.length,
              format.state,
              format.handler,
              format.context);
            formats.push(childFormat);
          } else {
            childFormat.endIndex = format.startIndex + index + item.length;
          }
        }
        index += item.length;
      });
      formats.forEach(f => this.mergeFormat(f, true))
    }
  }

  /**
   * 渲染 DOM
   */
  render() {

    let formats: FormatRange[] = [];
    // 检出所有生效规则
    this.formatMatrix.forEach(value => {
      formats = formats.concat(value);
    });
    // 排序所有生效规则并克隆副本，防止修改原始数据，影响第二次变更检测
    const canApplyFormats = formats.sort((n, m) => {
      const a = n.startIndex - m.startIndex;
      if (a === 0) {
        const b = m.endIndex - n.endIndex;
        if (b === 0) {
          return n.handler.priority - m.handler.priority;
        }
        return b;
      }
      return a;
    }).map(item => item.clone());

    const vDom = this.createVDom(canApplyFormats);
    const r = this.viewBuilder(vDom, this.contents);
    this.children = r.newNodes;
    this.elements = Array.from(r.fragment.childNodes);
    return r.fragment;
  }

  /**
   * 合并当前片段的格式化信息
   * @param format
   * @param highestPriority
   */
  mergeFormat(format: FormatRange, highestPriority = false) {
    const oldFormats = this.formatMatrix.get(format.handler);
    let formatRanges: FormatRange[] = [];

    if (oldFormats) {
      const styleMarks: MatchState[] = [];
      if (highestPriority) {
        oldFormats.unshift(format);
      } else {
        oldFormats.push(format);
      }
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
    const ff = formatRanges.filter(f => f.state !== MatchState.Normal);
    if (ff.length) {
      this.formatMatrix.set(format.handler, ff);
    } else {
      this.formatMatrix.delete(format.handler);
    }
  }

  destroyView() {
    this.contents.getFragments().forEach(f => f.destroyView());
    this.elements.forEach(el => {
      try {
        el.parentNode && el.parentNode.removeChild(el)
      } catch (e) {
        console.log(this, el)
      }
    });
    this.elements = [];
  }

  /**
   * 根据虚拟 DOM 树和内容生成真实 DOM
   * @param vNode
   * @param contents
   */
  private viewBuilder(vNode: VirtualNode, contents: Contents) {
    const fragment = document.createDocumentFragment();
    const newNodes: VirtualNode[] = [];
    if (vNode instanceof VirtualContainerNode) {
      const nodes: VirtualNode[] = [];
      let container: HTMLElement;
      let slotContainer: HTMLElement;
      vNode.formats.reduce((node, next) => {
        if (next.handler) {
          const renderModel = next.handler.execCommand.render(next.state, node);
          if (renderModel instanceof ReplaceModel) {
            container = renderModel.replaceElement;
            container[VIRTUAL_NODE] = vNode;
            // container[FRAGMENT_CONTEXT] = this;
            vNode.elementRef = container;
            slotContainer = container;
            return renderModel.replaceElement;
          } else if (renderModel instanceof ChildSlotModel) {
            if (node) {
              node.appendChild(renderModel.slotElement);
            } else {
              container = renderModel.slotElement;
            }
            slotContainer = renderModel.slotElement;
            slotContainer[VIRTUAL_NODE] = vNode;
            // slotContainer[FRAGMENT_CONTEXT] = this;
            vNode.elementRef = slotContainer;
            return renderModel.slotElement;
          }
        }
        return node;
      }, (null as HTMLElement));

      if (container) {
        fragment.appendChild(container);
      }
      vNode.children.forEach(vNode => {
        const r = this.viewBuilder(vNode, contents);
        (slotContainer || fragment).appendChild(r.fragment);
        nodes.push(...r.newNodes);
      });
      newNodes.push(vNode);
      vNode.children = nodes;
    } else {
      const c = contents.slice(vNode.formats[0].startIndex, vNode.formats[0].endIndex);
      let i = 0;
      c.forEach(item => {
        const newFormatRange = new FormatRange(
          i + vNode.formats[0].startIndex,
          item.length + vNode.formats[0].startIndex,
          null, null, vNode.formats[0].context);

        const v = new VirtualNode([newFormatRange], vNode.parent);
        newNodes.push(v);
        if (typeof item === 'string') {
          let currentNode = document.createTextNode(item);
          currentNode[VIRTUAL_NODE] = v;
          // currentNode[FRAGMENT_CONTEXT] = this;
          v.elementRef = currentNode;
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
    const root = new VirtualContainerNode([new FormatRange(0, this.contents.length, null, null, this)], null);
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
  private vDomBuilder(formatRanges: FormatRange[], parent: VirtualContainerNode, startIndex: number, endIndex: number) {
    while (startIndex < endIndex) {
      let firstRange = formatRanges.shift();
      if (firstRange) {
        if (startIndex < firstRange.startIndex) {
          const f = new FormatRange(startIndex, firstRange.startIndex, null, null, this);
          parent.children.push(new VirtualNode([f], parent));
        }
        const container = new VirtualContainerNode([firstRange], parent);
        const childFormatRanges: FormatRange[] = [];
        while (true) {
          const f = formatRanges[0];
          if (f && f.startIndex === firstRange.startIndex && f.endIndex === firstRange.endIndex) {
            container.formats.push(formatRanges.shift());
          } else {
            break;
          }
        }
        let index = 0;
        while (true) {
          const f = formatRanges[index];
          if (f && f.startIndex <= firstRange.endIndex) {
            if (f.endIndex <= firstRange.endIndex) {
              childFormatRanges.push(formatRanges.shift());
            } else {
              const cloneRange = f.clone();
              cloneRange.endIndex = firstRange.endIndex;
              childFormatRanges.push(cloneRange);
              f.startIndex = firstRange.endIndex;
              index++;
            }
          } else {
            break;
          }
        }
        if (childFormatRanges.length) {
          this.vDomBuilder(childFormatRanges, container, firstRange.startIndex, firstRange.endIndex);
        } else {
          const f = new FormatRange(firstRange.startIndex, firstRange.endIndex, null, null, this);
          container.children.push(new VirtualNode([f], parent))
        }
        parent.children.push(container);
        startIndex = firstRange.endIndex;
      } else {
        parent.children.push(new VirtualNode([new FormatRange(startIndex, endIndex, null, null, this)], parent));
        break;
      }
    }
  }
}
