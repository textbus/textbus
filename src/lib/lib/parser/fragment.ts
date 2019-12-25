import { Contents } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { VirtualContainerNode, VirtualNode } from './virtual-dom';
import { View } from './view';
import { VIRTUAL_NODE } from './help';
import { ChildSlotModel, ReplaceModel } from '../commands/commander';
import { Priority } from '../toolbar/help';
import { FormatRange } from './format';
import { Single } from './single';
import { RootFragment } from './root-fragment';
import { Parser, ParseState } from './parser';
import { getCanApplyFormats, mergeFormat } from './utils';

export class Fragment extends View {
  readonly length = 1;
  virtualNode: VirtualContainerNode;

  get contentLength() {
    return this.contents.length;
  }

  private formatMatrix = new Map<Handler, FormatRange[]>();
  private contents = new Contents();

  private host: HTMLElement;
  private elements: Node[] = [];

  private destroyed = false;

  constructor(public parent: Fragment) {
    super();
  }

  getFormatRangesByHandler(handler: Handler) {
    return this.formatMatrix.get(handler);
  }

  cleanFormats() {
    this.formatMatrix.clear();
  }

  getFormatHandlers() {
    return Array.from(this.formatMatrix.keys());
  }

  getFormatRanges() {
    return Array.from(this.formatMatrix.values()).reduce((v, n) => v.concat(n), []);
  }

  useFormats(formats: Map<Handler, FormatRange[]>) {
    this.formatMatrix = new Map<Handler, FormatRange[]>();
    Array.from(formats.keys()).forEach(key => {
      this.formatMatrix.set(key, formats.get(key).map(i => i.clone()));
    });
  }

  getFormatMatrix() {
    const formatMatrix = new Map<Handler, FormatRange[]>();
    Array.from(this.formatMatrix.keys()).forEach(key => {
      formatMatrix.set(key, this.formatMatrix.get(key).map(i => i.clone()));
    });
    return formatMatrix;
  }

  /**
   * 克隆当前片段的副本
   */
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

  useContents(contents: Contents) {
    this.contents = contents;
    contents.slice(0).forEach(i => {
      if (i instanceof Single || i instanceof Fragment) {
        i.parent = this;
      }
    });
  }

  sliceContents(startIndex: number, endIndex?: number) {
    return this.contents.slice(startIndex, endIndex);
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

  /**
   * 在当前片段的指定位置插入内容
   * @param content
   * @param index
   */
  insert(content: string | View, index: number) {
    if (content instanceof Single || content instanceof Fragment) {
      content.parent = this;
    }
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
          if (format.startIndex >= index && format.startIndex > 0) {
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
   * 在当前片段的最后增加内容
   * @param content
   * @param insertAdjacentInlineFormat
   */
  append(content: string | View, insertAdjacentInlineFormat = false) {
    if (content instanceof Single || content instanceof Fragment) {
      content.parent = this;
    }
    const length = this.contents.length;
    this.contents.append(content);
    Array.from(this.formatMatrix.values()).reduce((v, n) => v.concat(n), []).forEach(format => {
      const priorities = [Priority.Default, Priority.Block, Priority.BlockStyle];
      if (insertAdjacentInlineFormat) {
        priorities.push(Priority.Property, Priority.Inline);
      }
      if (priorities.includes(format.handler.priority) || (content instanceof Single && format.endIndex === length)) {
        format.endIndex += content.length;
      }
    })
  }

  getContentAtIndex(index: number) {
    return this.contents.getContentAtIndex(index);
  }

  find(el: View) {
    return this.contents.find(el);
  }

  getAllChildContentsLength() {
    return this.contents.getAllChildContentsLength();
  }

  insertFragmentContents(fragment: Fragment, index: number) {
    const contentsLength = fragment.contents.length;
    const elements = fragment.contents.slice(0).map(content => {
      if (content instanceof Single || content instanceof Fragment) {
        content.parent = this;
      }
      return content;
    });
    this.contents.insertElements(elements, index);
    Array.from(this.formatMatrix.keys()).forEach(key => {
      const formatRanges = this.formatMatrix.get(key);
      if ([Priority.Inline, Priority.Property].includes(key.priority)) {
        const newRanges: FormatRange[] = [];
        formatRanges.forEach(format => {
          if (format.startIndex < index && format.endIndex > index) {
            const f = format.clone();
            f.startIndex = index;
            format.endIndex = index;
            newRanges.push(format, f);
          } else {
            newRanges.push(format);
          }
        });
        newRanges.forEach(format => {
          if (format.startIndex === index) {
            format.startIndex += contentsLength;
            format.endIndex += contentsLength;
          }
        });
        this.formatMatrix.set(key, newRanges);
      } else {
        formatRanges.forEach(format => {
          format.endIndex += contentsLength;
        })
      }
    });
    Array.from(fragment.formatMatrix.keys())
      .filter(key => [Priority.Inline, Priority.Property].includes(key.priority))
      .forEach(key => {
        const formatRanges = fragment.formatMatrix.get(key);
        formatRanges.forEach(format => {
          const c = format.clone();
          c.startIndex += index;
          c.endIndex += index;
          this.mergeFormat(c, true);
        });
      });
  }

  /**
   *
   * @param startIndex
   * @param endIndex
   */
  delete(startIndex: number, endIndex = this.contents.length) {

    const ff = new Fragment(null);
    if (endIndex <= startIndex) {
      return ff;
    }
    this.contents.delete(startIndex, endIndex).forEach(item => {
      if (typeof item === 'string') {
        ff.append(item);
      } else if (item instanceof Single || item instanceof Fragment) {
        // const c = item.clone();
        // c.parent = ff;
        ff.append(item);
        if (item instanceof Fragment) {
          item.destroyView();
        }
      }
    });
    const formatMatrix = new Map<Handler, FormatRange[]>();

    Array.from(this.formatMatrix.keys()).forEach(key => {
      const formats: FormatRange[] = [];
      const newFragmentFormats: FormatRange[] = [];
      this.formatMatrix.get(key).forEach(format => {
        const cloneFormat = format.clone();
        cloneFormat.startIndex = 0;
        if ([Priority.Default, Priority.Block, Priority.BlockStyle].includes(format.handler.priority)) {
          cloneFormat.endIndex = ff.contents.length;
          newFragmentFormats.push(cloneFormat);

          format.endIndex -= length;
          formats.push(format);
        } else {
          if (format.startIndex <= endIndex && format.endIndex >= startIndex) {
            cloneFormat.startIndex = Math.max(format.startIndex - startIndex, 0);
            cloneFormat.endIndex = Math.min(format.endIndex - startIndex, ff.contents.length);
            newFragmentFormats.push(cloneFormat);
          }
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
            } else if (format.startIndex === 0 && startIndex === 0) {
              format.startIndex = format.endIndex = 0;
              formats.push(format);
            }
          }
        }
      });
      if (formats.length) {
        formatMatrix.set(key, formats);
      }
      if (newFragmentFormats) {
        ff.formatMatrix.set(key, newFragmentFormats);
      }
    });
    this.formatMatrix = formatMatrix;
    return ff;
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
    let fragment: Fragment = this;
    while (fragment.parent) {
      fragment = fragment.parent;
    }
    this.formatMatrix.clear();
    this.viewBuilder(vDom, this.contents, (fragment as RootFragment).parser, host, nextSibling);
    return host;
  }

  destroyView() {
    let nextSibling: Node = null;
    this.contents.getFragments().forEach(f => {
      const p = f.destroyView();
      nextSibling = p.nextSibling || nextSibling;
    });
    this.elements.forEach(el => {
      if (el.parentNode) {
        nextSibling = el.nextSibling || nextSibling;
        el.parentNode.removeChild(el);
      }
    });
    return {
      host: this.host,
      nextSibling: (nextSibling && nextSibling.parentNode === this.host) ? nextSibling : null
    };
  }

  mergeFormat(format: FormatRange, important = false) {
    mergeFormat(this.formatMatrix, format, important);
  }

  private getCanApplyFormats() {
    return getCanApplyFormats(this.formatMatrix);
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyView();
    this.contents.getFragments().forEach(f => f.destroy());
    if (this.parent) {
      const index = this.getIndexInParent();
      this.parent.delete(index, index + 1);
    }
    this.formatMatrix.clear();
    this.contents = new Contents();
    this.virtualNode = null;
    this.parent = null;
    this.destroyed = true;
  }

  getIndexInParent() {
    if (this.parent) {
      let i = this.parent.contents.find(this);
      if (i < 0) {
        throw new Error(`it's parent fragment is incorrect!`);
      }
      return i;
    }
    return -1;
  }

  /**
   * 根据虚拟 DOM 树和内容生成真实 DOM
   * @param vNode
   * @param contents
   * @param parser
   * @param host
   * @param nextSibling
   */
  private viewBuilder(vNode: VirtualNode, contents: Contents, parser: Parser, host: HTMLElement, nextSibling?: Node) {
    const newNodes: VirtualNode[] = [];
    if (vNode instanceof VirtualContainerNode) {
      const nodes: VirtualNode[] = [];
      let container: HTMLElement;
      let slotContainer: HTMLElement;
      const newFormatStates: ParseState[][] = [];
      vNode.formats.reduce((node, next) => {
        if (next.handler) {
          const renderModel = next.handler.execCommand.render(next.state, node, next.cacheData);
          if (renderModel instanceof ReplaceModel) {
            newFormatStates.length = 0;
            newFormatStates.push(parser.getFormatStateByNode(renderModel.replaceElement));
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
            newFormatStates.push(parser.getFormatStateByNode(renderModel.slotElement));
            slotContainer = renderModel.slotElement;
            slotContainer[VIRTUAL_NODE] = vNode;
            vNode.elementRef = slotContainer;
            return renderModel.slotElement;
          }
        }
        if (node) {
          newFormatStates.push(parser.getFormatStateByNode(node));
        }
        return node;
      }, (null as HTMLElement));

      newFormatStates.forEach(formats => {
        formats.forEach(item => {
          vNode.context.mergeFormat(new FormatRange({
            startIndex: vNode.startIndex,
            endIndex: vNode.endIndex,
            state: item.state,
            handler: item.token,
            context: vNode.context,
            cacheData: item.cacheData
          }), true);
        })
      });

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

      vNode.children.forEach(childVNode => {
        let newNodes: VirtualNode[];
        if (childVNode.context !== vNode.context) {
          childVNode.context.formatMatrix.clear();
        }
        if (slotContainer) {
          newNodes = this.viewBuilder(childVNode, contents, parser, slotContainer);
        } else {
          newNodes = this.viewBuilder(childVNode, contents, parser, host, nextSibling);
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
            newFormatRange.startIndex,
            newFormatRange.endIndex);
          newNodes.push(v);
          const str = item.replace(/\s\s+/g, str => {
            return ' ' + Array.from({
              length: str.length - 1
            }).fill('\u00a0').join('');
          }).replace(/\s$/, '\u00a0');
          let currentNode = document.createTextNode(str);
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
          if (item instanceof Fragment) {
            item.render(host, nextSibling);
          } else {
            item.render(host);
          }
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
    const containerFormatRanges: FormatRange[] = [];
    const childFormatRanges: FormatRange[] = [];

    formatRanges.forEach(format => {
      if ([Priority.Default, Priority.Block, Priority.BlockStyle].includes(format.handler.priority) ||
        format.startIndex === 0 && format.endIndex === this.contents.length) {
        containerFormatRanges.push(format);
      } else {
        childFormatRanges.push(format);
      }
    });

    const root = new VirtualContainerNode(containerFormatRanges, this, 0, this.contents.length);
    this.vDomBuilder(childFormatRanges,
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
    if (startIndex === 0 && endIndex === 0) {
      // 兼容空标签节点
      parent.children.push(new VirtualNode([new FormatRange({
        startIndex,
        endIndex,
        handler: null,
        context: this,
        state: null,
        cacheData: null
      })], this, startIndex, endIndex));
      return;
    }
    while (startIndex < endIndex) {
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
          parent.children.push(new VirtualNode([f], this, startIndex, firstRange.startIndex));
        }
        const container = new VirtualContainerNode([firstRange], this, firstRange.startIndex, firstRange.endIndex);
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
          container.children.push(new VirtualNode([f], this, firstRange.startIndex, firstRange.endIndex))
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
        })], this, startIndex, endIndex));
        break;
      }
    }
  }
}
