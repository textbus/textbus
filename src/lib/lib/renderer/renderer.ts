import { VBlockNode, VInlineNode, VNode, VTextNode, VMediaNode } from './virtual-dom';
import { Parser, ParseState } from '../parser/parser';
import { ChildSlotModel, ReplaceModel } from '../commands/commander';
import { VIRTUAL_NODE } from '../parser/help';
import { FormatRange } from '../parser/format';

export class Renderer {
  private oldVNode: VBlockNode;
  private elements: Node[] = [];
  private host: HTMLElement;

  constructor(private parser: Parser) {
  }

  render(newVNode: VBlockNode, host: HTMLElement) {
    this.host = host;
    this.oldVNode = newVNode;
    host[VIRTUAL_NODE]= newVNode;
    newVNode.nativeElement = host;
    this.viewBuilder(newVNode, host)
  }

  private destroy() {
    this.elements.forEach(el => {
      el.parentNode.removeChild(el);
    });
  }

  /**
   * 根据虚拟 DOM 树和内容生成真实 DOM
   * @param vNode
   * @param host
   */
  private viewBuilder(vNode: VNode, host: HTMLElement) {
    if (vNode instanceof VBlockNode || vNode instanceof VInlineNode) {
      let container: HTMLElement;
      let slotContainer: HTMLElement;
      const newFormatStates: ParseState[][] = [];
      vNode.formats.reduce((node, next) => {
        if (next.handler) {
          const renderModel = next.handler.execCommand.render(next.state, node, next.cacheData);
          if (renderModel instanceof ReplaceModel) {
            newFormatStates.length = 0;
            newFormatStates.push(this.parser.getFormatStateByNode(renderModel.replaceElement));
            container = renderModel.replaceElement;
            container[VIRTUAL_NODE] = vNode;
            vNode.nativeElement = container;
            slotContainer = container;
            return renderModel.replaceElement;
          } else if (renderModel instanceof ChildSlotModel) {
            if (node) {
              node.appendChild(renderModel.slotElement);
            } else {
              container = renderModel.slotElement;
            }
            newFormatStates.push(this.parser.getFormatStateByNode(renderModel.slotElement));
            slotContainer = renderModel.slotElement;
            slotContainer[VIRTUAL_NODE] = vNode;
            vNode.nativeElement = slotContainer;
            return renderModel.slotElement;
          }
        }
        if (node) {
          newFormatStates.push(this.parser.getFormatStateByNode(node));
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
        host.appendChild(container);
      }

      vNode.children.forEach(childVNode => {
        if (childVNode.context !== vNode.context) {
          childVNode.context.cleanFormats();
        }
        this.viewBuilder(childVNode, slotContainer || host);
      });
    } else if (vNode instanceof VTextNode) {
      const str = vNode.text.replace(/\s\s+/g, str => {
        return ' ' + Array.from({
          length: str.length - 1
        }).fill('\u00a0').join('');
      }).replace(/\s$/, '\u00a0');
      let currentNode = document.createTextNode(str);
      currentNode[VIRTUAL_NODE] = vNode;
      vNode.nativeElement = currentNode;
      host.appendChild(currentNode);
    } else if (vNode instanceof VMediaNode) {
      // host.appendChild(vNode.)
    }
  }
}
