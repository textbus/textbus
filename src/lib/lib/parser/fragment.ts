import { Contents } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { FormatState, MatchDescription } from '../matcher/matcher';
import { VirtualContainerNode, VirtualNode } from './virtual-dom';
import { ViewNode } from './view-node';
import { VIRTUAL_NODE } from './help';
import { ReplaceModel, ChildSlotModel } from '../commands/commander';
import { CacheData } from '../toolbar/help';

export interface FormatRangeParams {
  startIndex: number;
  endIndex: number;
  handler: Handler;
  context: Fragment;
  state: FormatState;
  matchDescription?: MatchDescription;
  cacheData?: CacheData;
}

export class FormatRange {
  startIndex: number;
  endIndex: number;
  handler: Handler;
  context: Fragment;
  state: FormatState;
  matchDescription?: MatchDescription;
  cacheData?: CacheData;

  constructor(private params: FormatRangeParams | FormatRange) {
    this.startIndex = params.startIndex;
    this.endIndex = params.endIndex;
    this.handler = params.handler;
    this.context = params.context;
    this.state = params.state;
    this.matchDescription = params.matchDescription;
    this.cacheData = params.cacheData;
  }

  clone() {
    return new FormatRange(this);
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

  /**
   * 给当前片段应用新的格式
   * @param format 新格式的应用范围
   * @param canSurroundBlockElement 是否可以包含块级节点，如 strong 不可以包含 p，则应传入 false
   */
  apply(format: FormatRange, canSurroundBlockElement: boolean) {
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
            childFormat = new FormatRange({
              startIndex: format.startIndex + index,
              endIndex: format.startIndex + index + item.length,
              handler: format.handler,
              context: format.context,
              state: format.state,
              matchDescription: format.matchDescription,
              cacheData: format.cacheData
            });
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
      const formatMarks: Array<FormatRange> = [];
      if (highestPriority) {
        oldFormats.unshift(format);
      } else {
        oldFormats.push(format);
      }
      let index = oldFormats.length - 1;
      while (index >= 0) {
        const item = oldFormats[index];
        if (formatMarks.length < item.endIndex) {
          formatMarks.length = item.endIndex;
        }
        formatMarks.fill(item, item.startIndex, item.endIndex);
        index--;
      }
      let newFormatRange: FormatRange = null;
      for (let i = 0; i < formatMarks.length; i++) {
        const mark = formatMarks[i];

        if (!mark) {
          continue;
        }
        if (!newFormatRange) {
          newFormatRange = new FormatRange({
            startIndex: i,
            endIndex: i + 1,
            handler: mark.handler,
            context: this,
            state: mark.state,
            matchDescription: mark.matchDescription,
            cacheData: mark.cacheData
          });
          formatRanges.push(newFormatRange);
          continue;
        }
        if (mark.state === newFormatRange.state &&
          (!mark.cacheData && !newFormatRange.cacheData ||
            mark.cacheData.equal(newFormatRange.cacheData))) {
          newFormatRange.endIndex = i + 1;
        } else {
          newFormatRange = new FormatRange({
            startIndex: i,
            endIndex: i + 1,
            handler: mark.handler,
            context: this,
            state: mark.state,
            matchDescription: mark.matchDescription,
            cacheData: mark.cacheData
          });
          formatRanges.push(newFormatRange);
        }
      }
    } else {
      formatRanges.push(format);
    }
    const ff = formatRanges.filter(f => f.state !== FormatState.Invalid);
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
          const renderModel = next.handler.execCommand.render(next.state, node, next.cacheData);
          if (renderModel instanceof ReplaceModel) {
            container = renderModel.replaceElement;
            container[VIRTUAL_NODE] = vNode;
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
        const newFormatRange = new FormatRange({
          startIndex: i + vNode.formats[0].startIndex,
          endIndex: item.length + vNode.formats[0].startIndex,
          handler: null,
          context: vNode.formats[0].context,
          state: null
        });

        const v = new VirtualNode([newFormatRange], vNode.parent);
        newNodes.push(v);
        if (typeof item === 'string') {
          let currentNode = document.createTextNode(item);
          currentNode[VIRTUAL_NODE] = v;
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
    const root = new VirtualContainerNode([new FormatRange({
      startIndex: 0,
      endIndex: this.contents.length,
      handler: null,
      context: this,
      state: null
    })], null);
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
          const f = new FormatRange({
            startIndex,
            endIndex: firstRange.startIndex,
            handler: null,
            context: this,
            state: null
          });
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
          if (f && f.startIndex < firstRange.endIndex) {
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
          const f = new FormatRange({
            startIndex: firstRange.startIndex,
            endIndex: firstRange.endIndex,
            handler: null,
            context: this,
            state: null
          });
          container.children.push(new VirtualNode([f], parent))
        }
        parent.children.push(container);
        startIndex = firstRange.endIndex;
      } else {
        parent.children.push(new VirtualNode([new FormatRange({
          startIndex,
          endIndex,
          handler: null,
          context: this,
          state: null
        })], parent));
        break;
      }
    }
  }
}
