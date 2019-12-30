import { VirtualContainerNode, VirtualNode } from './virtual-dom';
import { FormatRange } from '../parser/format';
import { Contents } from '../parser/contents';
import { Priority } from '../toolbar/help';
import { Fragment } from '../parser/fragment';
import { Parser, ParseState } from '../parser/parser';
import { ChildSlotModel, ReplaceModel } from '../commands/commander';
import { VIRTUAL_NODE } from '../parser/help';
import { View } from '../parser/view';
import { FormatState } from '../matcher/matcher';
import { RootFragment } from '../parser/root-fragment';
import { start } from 'repl';

export class Renderer {
  private vNode: VirtualContainerNode;
  private nativeElements: Node[] = [];

  constructor(private context: Fragment) {
  }

  render(formatRanges: FormatRange[], contents: Contents) {
    this.vNode = this.createVDom(formatRanges, contents);

    contents.slice(0).forEach(i => {
      if (i instanceof Fragment) {
        const div = document.createElement('div');
        i.render(div);
      }
    })

    let fragment: Fragment = this.context;
    while (fragment.parent) {
      fragment = fragment.parent;
    }
    const div = document.createElement('div');
    console.log(this.vNode);
    this.viewBuilder(this.vNode, contents, (fragment as RootFragment).editor.parser, div);
    console.log(div)
    document.body.appendChild(div)
  }

  /**
   * 根据可应用的格式化信息生成构建 dom 树所依赖的格式化树状数据结构
   * @param formatRanges 可应用的格式化数据
   * @param contents 格式化内容
   */
  private createVDom(formatRanges: FormatRange[], contents: Contents) {
    const containerFormatRanges: FormatRange[] = [];
    const childFormatRanges: FormatRange[] = [];

    formatRanges.forEach(format => {
      if ([Priority.Default, Priority.Block, Priority.BlockStyle].includes(format.handler.priority) ||
        format.startIndex === 0 && format.endIndex === contents.length) {
        containerFormatRanges.push(format);
      } else {
        childFormatRanges.push(format);
      }
    });

    const root = new VirtualContainerNode(containerFormatRanges, this.context, 0, contents.length);
    this.vDomBuilder(childFormatRanges,
      root,
      0,
      contents.length
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
        context: this.context,
        state: null,
        cacheData: null
      })], this.context, startIndex, endIndex));
      return;
    }

    let depthVNodes: VirtualContainerNode[] = [parent];


    while (startIndex < endIndex) {
      let isSplit = false;
      const vNodes: VirtualContainerNode[] = [];
      depthVNodes.forEach(item => {
        console.log(item.endIndex, startIndex)
        if (item.endIndex === startIndex) {
          isSplit = true;
        }
        if (isSplit) {
          if (item.endIndex > startIndex) {
            item.endIndex = startIndex;
            formatRanges.unshift(...item.formats.map(f => {
              f.endIndex = startIndex;
              const c = f.clone();
              c.startIndex = startIndex;
              return c;
            }));
            console.log(item, startIndex)
          }
        } else {
          if (item.endIndex > startIndex) {
            vNodes.push(item);
          }
        }
      });
      depthVNodes = vNodes;
      let min = startIndex;
      let max = endIndex;
      while (true) {
        const first = formatRanges[0];
        if (first) {
          if (first.startIndex === startIndex) {
            max = Math.min(max, first.endIndex);
            const p = depthVNodes[depthVNodes.length - 1];
            const vNode = new VirtualContainerNode([first], this.context, startIndex, first.endIndex);
            p.children.push(vNode);
            depthVNodes.push(vNode);
            formatRanges.shift();
            continue;
          } else {
            min = startIndex;
            startIndex = first.startIndex;
            max = Math.min(max, first.startIndex);
          }
        }
        const last = depthVNodes[depthVNodes.length - 1];
        let textVNode = new VirtualNode([new FormatRange({
          startIndex: min,
          endIndex: max,
          state: FormatState.Valid,
          handler: null,
          cacheData: null,
          context: this.context
        })], this.context, min, max);
        last.children.push(textVNode);
        startIndex = max;
        break;
      }
    }
  }


  /**
   * 根据虚拟 DOM 树和内容生成真实 DOM
   * @param vNode
   * @param contents
   * @param parser
   * @param host
   */
  private viewBuilder(vNode: VirtualNode, contents: Contents, parser: Parser, host: HTMLElement) {
    const newNodes: VirtualNode[] = [];
    if (vNode instanceof VirtualContainerNode) {
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
        this.nativeElements.push(container);
        host.appendChild(container);
      }

      vNode.children.forEach(childVNode => {
        if (childVNode.context !== vNode.context) {
          childVNode.context.cleanFormats();
        }
        this.viewBuilder(childVNode, contents, parser, slotContainer || host);
      });
      newNodes.push(vNode);
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
            this.context,
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
          this.nativeElements.push(currentNode);
          host.appendChild(currentNode);
        } else if (item instanceof View) {
          item.render(host);
          newNodes.push(item.virtualNode);
        }
        i += item.length;
      });
    }

    return newNodes;
  }
}
