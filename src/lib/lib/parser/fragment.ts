import { Contents } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { FormatState } from '../matcher/matcher';
import { VirtualContainerNode, VirtualNode } from './virtual-dom';
import { View } from './view';
import { VIRTUAL_NODE } from './help';
import { ReplaceModel, ChildSlotModel } from '../commands/commander';
import { CacheDataParams, CacheData } from '../toolbar/utils/cache-data';
import { Priority } from '../toolbar/help';
import { Single } from './single';

export interface FormatRangeParams {
  startIndex: number;
  endIndex: number;
  handler: Handler;
  context: Fragment | Single;
  state: FormatState;
  cacheData: CacheDataParams;
}

export class FormatRange {
  startIndex: number;
  endIndex: number;
  handler: Handler;
  context: Fragment | Single;
  state: FormatState;
  cacheData: CacheData;

  constructor(private params: FormatRangeParams | FormatRange) {
    this.startIndex = params.startIndex;
    this.endIndex = params.endIndex;
    this.handler = params.handler;
    this.context = params.context;
    this.state = params.state;
    this.cacheData = params.cacheData && new CacheData(params.cacheData);
  }

  clone() {
    return new FormatRange(this);
  }
}

export class Fragment extends View {
  readonly length = 1;
  elements: Node[] = [];
  contents = new Contents();
  virtualNode: VirtualContainerNode;

  constructor(public parent: Fragment) {
    super();
  }

  clone(): Fragment {
    const ff = new Fragment(this.parent);
    ff.contents = this.contents.clone();
    ff.formatMatrix = new Map<Handler, FormatRange[]>();
    Array.from(this.formatMatrix.keys()).forEach(key => {
      ff.formatMatrix.set(key, this.formatMatrix.get(key).map(f => f.clone()));
    });
    return ff;
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

  insert(content: string | View, index: number) {
    this.contents.insert(content, index);
    const newFormats: FormatRange[] = [];
    Array.from(this.formatMatrix.values()).reduce((v, n) => v.concat(n), []).forEach(format => {
      if (format.handler.priority === Priority.Block || format.handler.priority === Priority.Default) {
        format.endIndex += content.length;
      } else {
        if (content instanceof Fragment && format.startIndex < index && format.endIndex >= index) {
          newFormats.push(new FormatRange({
            startIndex: index + 1,
            endIndex: format.endIndex + 1,
            state: format.state,
            handler: format.handler,
            context: this,
            cacheData: format.cacheData.clone()
          }));
          format.endIndex = index;
        } else {
          if (format.startIndex >= index) {
            format.startIndex += content.length;
          }
          if (format.endIndex >= index) {
            format.endIndex += content.length;
          }
        }
      }
    });
    newFormats.forEach(f => {
      this.mergeFormat(f, true);
    });
  }

  /**
   * 渲染 DOM
   */
  render() {
    const canApplyFormats = this.getCanApplyFormats();

    const vDom = this.createVDom(canApplyFormats);
    this.virtualNode = vDom;
    const r = this.viewBuilder(vDom, this.contents);
    this.elements = Array.from(r.fragment.childNodes);
    return r.fragment;
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

        if (typeof item === 'string') {
          const newFormatRange = new FormatRange({
            startIndex: i + vNode.formats[0].startIndex,
            endIndex: i + vNode.formats[0].startIndex + item.length,
            handler: null,
            context: vNode.formats[0].context,
            state: null,
            cacheData: null
          });
          const v = new VirtualNode([newFormatRange], this, vNode.parent);
          newNodes.push(v);
          // 防止 html 实体及 unicode 字符原样输出
          const template = document.createElement('div');
          template.innerHTML = item.replace(/\s\s+/g, str => {
            return ' ' + Array.from({
              length: str.length - 1
            }).fill('&nbsp;').join('');
          }).replace(/\s$/, '&nbsp;');
          let currentNode = template.childNodes[0];
          currentNode[VIRTUAL_NODE] = v;
          v.elementRef = currentNode;
          fragment.appendChild(currentNode);
        } else if (item instanceof View) {
          const container = item.render();
          fragment.appendChild(container);
          newNodes.push(item.virtualNode);
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
      state: null,
      cacheData: null
    })], this, null);
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
    while (startIndex <= endIndex) {
      let firstRange = formatRanges.shift();
      if (firstRange) {
        if (startIndex < firstRange.startIndex) {
          const f = new FormatRange({
            startIndex,
            endIndex: firstRange.startIndex,
            handler: null,
            context: this,
            state: null,
            cacheData: null
          });
          parent.children.push(new VirtualNode([f], this, parent));
        }
        const container = new VirtualContainerNode([firstRange], this, parent);
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
            state: null,
            cacheData: null
          });
          container.children.push(new VirtualNode([f], this, parent))
        }
        parent.children.push(container);
        startIndex = firstRange.endIndex;
      } else {
        parent.children.push(new VirtualNode([new FormatRange({
          startIndex,
          endIndex,
          handler: null,
          context: this,
          state: null,
          cacheData: null
        })], this, parent));
        break;
      }
    }
  }
}
