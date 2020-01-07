import { VBlockNode, VInlineNode, VNode, VTextNode, VMediaNode } from './virtual-dom';
import { Parser, ParseState } from '../parser/parser';
import { ChildSlotModel, ReplaceModel } from '../commands/commander';
import { VIRTUAL_NODE } from '../parser/help';
import { BlockFormat, InlineFormat, SingleFormat } from '../parser/format';
import { Priority } from '../toolbar/help';

export class Renderer {
  private oldVNode: VBlockNode;

  constructor(private parser: Parser) {
  }

  render(newVNode: VBlockNode, host: HTMLElement) {
    let previousSibling: Node;
    newVNode.children.forEach(vNode => {
      const old = this?.oldVNode?.children.shift();
      previousSibling = this.diffAndUpdateView(vNode, old, host, previousSibling);
    });
    this?.oldVNode?.children.forEach(i => i.destroyView());
    this.oldVNode = newVNode;
    host[VIRTUAL_NODE] = newVNode;
    newVNode.wrapElement = host;
    newVNode.slotElement = host;
  }

  /**
   * 根据虚拟 DOM 树和内容生成真实 DOM
   * @param vNode
   * @param oldVNode
   * @param host
   * @param previousSibling
   */
  private diffAndUpdateView(vNode: VNode, oldVNode: VNode, host: HTMLElement, previousSibling: Node): Node {
    if (vNode instanceof VBlockNode || vNode instanceof VInlineNode) {
      return this.renderContainerNode(vNode, oldVNode, host, previousSibling);
    } else if (vNode instanceof VTextNode) {
      return this.renderTextNode(vNode, oldVNode, host, previousSibling);
    } else if (vNode instanceof VMediaNode) {
      return this.renderMediaNode(vNode, oldVNode, host, previousSibling);
    }
  }

  private renderMediaNode(vNode: VMediaNode, oldVNode: VNode, host: HTMLElement, previousSibling: Node): Node {
    if (!Renderer.diff(vNode, oldVNode)) {
      vNode.nativeElement = document.createElement(vNode.data.tagName);
      vNode.formats.reduce((node, next) => {
        if (next.handler) {
          const renderModel = next.handler.execCommand.render(next.state, node, next.cacheData);
          if (renderModel instanceof ReplaceModel) {
            vNode.nativeElement = renderModel.replaceElement;
            return renderModel.replaceElement;
          } else if (renderModel instanceof ChildSlotModel) {
            vNode.nativeElement = renderModel.slotElement;
            return renderModel.slotElement;
          }
        }
        return node;
      }, vNode.nativeElement as HTMLElement);

      if (vNode.nativeElement) {
        this.parser.getFormatStateByNode(vNode.nativeElement as HTMLElement).forEach(f => {
          vNode.data.mergeFormat(new SingleFormat({
            context: vNode.data,
            ...f
          }));
        });
        vNode.nativeElement[VIRTUAL_NODE] = vNode;
        host.appendChild(vNode.nativeElement);
      }
      if (oldVNode instanceof VMediaNode) {
        vNode.context.viewSynced();
      }
      if (oldVNode) {
        oldVNode.destroyView();
      }
    } else {
      vNode.nativeElement = (oldVNode as VMediaNode).nativeElement;
      vNode.nativeElement && (vNode.nativeElement[VIRTUAL_NODE] = vNode);
      Renderer.insertNode(previousSibling, vNode.nativeElement, host);
      (oldVNode as VMediaNode).nativeElement = null;
    }
    return vNode.nativeElement;
  }

  private renderContainerNode(vNode: VBlockNode | VInlineNode, oldVNode: VNode, host: HTMLElement, previousSibling: Node) {
    if (!Renderer.diff(vNode, oldVNode)) {
      const newFormatStates: ParseState[] = [];
      vNode.formats.reduce((node, next) => {
        if (next.handler) {
          const renderModel = next.handler.execCommand.render(next.state, node, next.cacheData);
          if (renderModel instanceof ReplaceModel) {
            newFormatStates.length = 0;
            newFormatStates.push(...this.parser.getFormatStateByNode(renderModel.replaceElement));
            vNode.wrapElement = vNode.slotElement = renderModel.replaceElement;
            vNode.wrapElement[VIRTUAL_NODE] = vNode;
            return renderModel.replaceElement;
          } else if (renderModel instanceof ChildSlotModel) {
            if (node) {
              node.appendChild(renderModel.slotElement);
            } else {
              vNode.wrapElement = renderModel.slotElement;
            }
            newFormatStates.push(...this.parser.getFormatStateByNode(renderModel.slotElement));
            vNode.slotElement = renderModel.slotElement;
            vNode.slotElement[VIRTUAL_NODE] = vNode;
            return renderModel.slotElement;
          }
        }
        if (node) {
          newFormatStates.push(...this.parser.getFormatStateByNode(node));
        }
        return node;
      }, (null as HTMLElement));
      newFormatStates.forEach(format => {
        switch (format.handler.priority) {
          case Priority.Default:
          case Priority.Block:
          case Priority.BlockStyle:
            vNode.context.mergeFormat(new BlockFormat({
              context: vNode.context,
              ...format
            }), true);
            break;
          case Priority.Inline:
          case Priority.Property:
            vNode.context.mergeFormat(new InlineFormat({
              startIndex: vNode.startIndex,
              endIndex: vNode instanceof VBlockNode ? vNode.context.contentLength : vNode.endIndex,
              context: vNode.context,
              ...format
            }), true);
            break;
        }
      });

      if (vNode.wrapElement) {
        host.appendChild(vNode.wrapElement);
      }
      if (oldVNode instanceof VBlockNode) {
        vNode.context.viewSynced();
      }
      if (oldVNode) {
        oldVNode.destroyView();
      }
    } else {
      // if (vNode instanceof VBlockNode && vNode === oldVNode) {
      //   return oldVNode.wrapElement;
      // }
      vNode.wrapElement = (oldVNode as VInlineNode).wrapElement;
      vNode.slotElement = (oldVNode as VInlineNode).slotElement;
      vNode.wrapElement && (vNode.wrapElement[VIRTUAL_NODE] = vNode);
      vNode.slotElement && (vNode.slotElement[VIRTUAL_NODE] = vNode);
      Renderer.insertNode(previousSibling, vNode.wrapElement, host);
      (oldVNode as VInlineNode).wrapElement = (oldVNode as VInlineNode).slotElement = null;
    }

    let p: Node;
    vNode.children.forEach(childVNode => {
      p = this.diffAndUpdateView(
        childVNode,
        (oldVNode instanceof VBlockNode || oldVNode instanceof VInlineNode) ? oldVNode.children.shift() : null,
        vNode.slotElement as HTMLElement || host, p);
    });
    if ((oldVNode instanceof VBlockNode || oldVNode instanceof VInlineNode)) {
      oldVNode.children.forEach(i => i.destroyView());
    }
    return vNode.wrapElement;
  }

  private renderTextNode(vNode: VTextNode, oldVNode: VNode, host: HTMLElement, previousSibling: Node): Node {
    if (!Renderer.diff(vNode, oldVNode)) {
      const str = vNode.text.replace(/\s\s+/g, str => {
        return ' ' + Array.from({
          length: str.length - 1
        }).fill('\u00a0').join('');
      }).replace(/\s$/, '\u00a0');
      if (oldVNode instanceof VTextNode) {
        vNode.nativeElement = oldVNode.nativeElement;
        vNode.nativeElement[VIRTUAL_NODE] = vNode;
        vNode.nativeElement.textContent = str;
        oldVNode.nativeElement = null;
        Renderer.insertNode(previousSibling, vNode.nativeElement, host);
      } else {
        let currentNode = document.createTextNode(str);
        currentNode[VIRTUAL_NODE] = vNode;
        vNode.nativeElement = currentNode;
        host.appendChild(currentNode);
        if (oldVNode) {
          oldVNode.destroyView();
        }
      }
    } else {
      vNode.nativeElement = oldVNode.nativeElement;
      vNode.nativeElement[VIRTUAL_NODE] = vNode;
      Renderer.insertNode(previousSibling, vNode.nativeElement, host);
      (oldVNode as VTextNode).nativeElement = null;
    }
    return vNode.nativeElement;
  }

  private static insertNode(previousSibling: Node, newNode: Node, host: HTMLElement) {
    if (previousSibling) {
      if (previousSibling.nextSibling) {
        if (previousSibling.nextSibling !== newNode) {
          host.insertBefore(newNode, previousSibling.nextSibling);
        }
      } else {
        host.appendChild(newNode);
      }
    } else if (newNode.parentNode !== host) {
      if (host.firstChild) {
        host.insertBefore(newNode, host.firstChild);
      } else {
        host.appendChild(newNode);
      }
    }
  }

  private static diff(newNode: VNode, oldNode: VNode): boolean {
    if (newNode === oldNode) {
      return true;
    }
    const sameType = (newNode instanceof VBlockNode && oldNode instanceof VBlockNode) ||
      (newNode instanceof VInlineNode && oldNode instanceof VInlineNode) ||
      (newNode instanceof VMediaNode && oldNode instanceof VMediaNode) ||
      (newNode instanceof VTextNode && oldNode instanceof VTextNode);

    if (!sameType) {
      return false;
    }
    if (newNode instanceof VTextNode) {
      return newNode.text === (oldNode as VTextNode).text;
    }

    if (newNode instanceof VMediaNode) {
      if (newNode.data.tagName !== (oldNode as VMediaNode).data.tagName) {
        return false;
      }
    }

    if (newNode.formats.length !== (oldNode as VBlockNode).formats.length) {
      return false;
    }
    for (let i = 0; i < newNode.formats.length; i++) {
      const newFormat = newNode.formats[i];
      const oldFormat = (oldNode as VBlockNode).formats[i];
      if (!oldFormat) {
        return false;
      }
      if (newFormat.state !== oldFormat.state ||
        newFormat.handler !== newFormat.handler ||
        !newFormat.cacheData.equal(oldFormat.cacheData)) {
        return false;
      }
    }
    return true;
  }
}
