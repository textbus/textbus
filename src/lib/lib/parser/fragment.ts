import { Contents } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { VirtualContainerNode, VirtualNode } from './virtual-dom';
import { View } from './view';
import { VIRTUAL_NODE } from './help';
import { ChildSlotModel, ReplaceModel } from '../commands/commander';
import { Priority } from '../toolbar/help';
import { FormatRange } from './format';
import { Single } from './single';

export class Fragment extends View {
  readonly length = 1;
  contents = new Contents();
  virtualNode: VirtualContainerNode;

  private host: HTMLElement;
  private elements: Node[] = [];

  private destroyed = false;

  constructor(public parent: Fragment) {
    super();
  }

  clone(): Fragment {
    const ff = new Fragment(this.parent);
    ff.contents = this.contents.clone();
    ff.contents.slice(0).filter(item => {
      if (item instanceof Single || item instanceof Fragment) {
        item.parent = ff;
      }
    });
    ff.formatMatrix = new Map<Handler, FormatRange[]>();
    Array.from(this.formatMatrix.keys()).forEach(key => {
      ff.formatMatrix.set(key, this.formatMatrix.get(key).map(f => {
        return f.clone();
      }));
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

  append(content: string | View) {
    this.contents.append(content);
    Array.from(this.formatMatrix.values()).reduce((v, n) => v.concat(n), []).forEach(format => {
      if (format.handler.priority === Priority.Block || format.handler.priority === Priority.Default) {
        format.endIndex += content.length;
      }
    })
  }

  delete(startIndex: number, length: number) {
    if (length <= 0) {
      return;
    }
    this.contents.slice(startIndex, startIndex + length).forEach(item => {
      if (item instanceof Fragment) {
        item.destroyView();
      }
    });
    this.contents.delete(startIndex, length);
    const endIndex = startIndex + length;
    const ff = new Map<Handler, FormatRange[]>();
    Array.from(this.formatMatrix.keys()).forEach(key => {
      const formats: FormatRange[] = [];
      this.formatMatrix.get(key).forEach(format => {
        if ([Priority.Default, Priority.Block, Priority.BlockStyle].includes(format.handler.priority)) {
          format.endIndex -= length;
          formats.push(format);
        } else {
          if (format.endIndex <= startIndex) {
            // 在选区之前
            formats.push(format);
          } else if (format.startIndex > endIndex) {
            // 在选区这后
            format.startIndex -= length;
            format.endIndex -= length;
            formats.push(format);
          } else {
            if (format.startIndex < startIndex) {
              format.endIndex = Math.max(startIndex, format.endIndex - length);
              formats.push(format);
            } else if (format.endIndex > endIndex) {
              format.startIndex = startIndex;
              format.endIndex = startIndex + format.endIndex - endIndex;
              formats.push(format);
            }
          }
        }
      });
      if (formats.length) {
        ff.set(key, formats);
      }
    });
    this.formatMatrix = ff;
  }

  /**
   * 渲染 DOM 到指定容器
   * @param host
   * @param nextSibling
   */
  render(host: HTMLElement, nextSibling?: Node) {
    const canApplyFormats = this.getCanApplyFormats();
    const vDom = this.createVDom(canApplyFormats);
    this.virtualNode = vDom;
    this.elements = [];
    this.host = host;
    host[VIRTUAL_NODE] = vDom;
    this.viewBuilder(vDom, this.contents, host, nextSibling);
  }

  destroyView() {
    this.contents.getFragments().forEach(f => f.destroyView());
    let nextSibling: Node = null;
    this.elements.forEach(el => {
      if (el.parentNode) {
        nextSibling = el.nextSibling;
        el.parentNode.removeChild(el);
      }
    });
    return {
      host: this.host,
      nextSibling
    };
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.contents.getFragments().forEach(f => f.destroy());
    this.destroyView();
    if (this.parent) {
      const index = this.parent.contents.find(this);
      this.parent.delete(index, 1);
    }
    this.formatMatrix.clear();
    this.contents = new Contents();
    this.virtualNode = null;
    this.parent = null;
    this.destroyed = true;
  }

  /**
   * 根据虚拟 DOM 树和内容生成真实 DOM
   * @param vNode
   * @param contents
   * @param host
   * @param nextSibling
   */
  private viewBuilder(vNode: VirtualNode, contents: Contents, host: HTMLElement, nextSibling?: Node) {
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
        if (host === this.host) {
          this.elements.push(container);
        }
        if (nextSibling) {
          host.insertBefore(container, nextSibling);
        } else {
          host.appendChild(container);
        }
      }
      vNode.children.forEach(vNode => {
        let newNodes: VirtualNode[];
        if (slotContainer) {
          newNodes = this.viewBuilder(vNode, contents, slotContainer);
        } else {
          newNodes = this.viewBuilder(vNode, contents, host, nextSibling);
        }
        nodes.push(...newNodes);
      });
      newNodes.push(vNode);
      vNode.children = nodes;
    } else {
      const c = contents.slice(vNode.startIndex, vNode.endIndex);
      let i = 0;
      c.forEach(item => {
        if (typeof item === 'string') {
          const newFormatRange = new FormatRange({
            startIndex: i + vNode.startIndex,
            endIndex: i + vNode.startIndex + item.length,
            handler: null,
            context: vNode.context,
            state: null,
            cacheData: null
          });
          const v = new VirtualNode(
            [newFormatRange],
            this,
            vNode.parent,
            newFormatRange.startIndex,
            newFormatRange.endIndex);
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
          if (nextSibling) {
            if (host === this.host) {
              this.elements.push(currentNode);
            }
            host.insertBefore(currentNode, nextSibling);
          } else {
            host.appendChild(currentNode);
          }
        } else if (item instanceof View) {
          item.render(host);
          newNodes.push(item.virtualNode);
        }
        i += item.length;
      });
    }

    return newNodes;
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
    })], this, null, 0, this.contents.length);
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
          parent.children.push(new VirtualNode([f], this, parent, startIndex, firstRange.startIndex));
        }
        const container = new VirtualContainerNode([firstRange], this, parent, firstRange.startIndex, firstRange.endIndex);
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
          container.children.push(new VirtualNode([f], this, parent, firstRange.startIndex, firstRange.endIndex))
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
        })], this, parent, startIndex, endIndex));
        break;
      }
    }
  }
}
