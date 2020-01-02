import { VBlockNode, VInlineNode, VNode, VTextNode, VMediaNode } from './virtual-dom';
import { Parser, ParseState } from '../parser/parser';
import { ChildSlotModel, ReplaceModel } from '../commands/commander';
import { VIRTUAL_NODE } from '../parser/help';
import { BlockFormat, InlineFormat } from '../parser/format';
import { Contents } from '../parser/contents';
import { Priority } from '../toolbar/help';

export class Renderer {
  private oldVNode: VBlockNode;
  private host: HTMLElement;

  constructor(private parser: Parser) {
  }

  render(newVNode: VBlockNode, host: HTMLElement) {
    this.host = host;
    this.diffAndUpdateView(newVNode, this.oldVNode, host);
    this.oldVNode = newVNode;
    host[VIRTUAL_NODE] = newVNode;
    newVNode.wrapElement = host;
    newVNode.wrapElement = host;
  }

  private destroy() {
  }

  // private cleanDirtyView(vNode: VNode) {
  //   if (vNode instanceof VBlockNode && !vNode.context.dirty) {
  //     return;
  //   }
  //   vNode.destroyView();
  //   if (vNode instanceof VBlockNode || vNode instanceof VInlineNode) {
  //     vNode.children.forEach(vNode => {
  //       this.cleanDirtyView(vNode);
  //     });
  //   }
  // }

  /**
   * 根据虚拟 DOM 树和内容生成真实 DOM
   * @param vNode
   * @param oldVNode
   * @param host
   */
  private diffAndUpdateView(vNode: VNode, oldVNode: VNode, host: HTMLElement) {
    if (vNode instanceof VBlockNode || vNode instanceof VInlineNode) {
      if (!this.diff(vNode, oldVNode)) {
        const newFormatStates: ParseState[][] = [];
        vNode.formats.reduce((node, next) => {
          if (next.handler) {
            const renderModel = next.handler.execCommand.render(next.state, node, next.cacheData);
            if (renderModel instanceof ReplaceModel) {
              newFormatStates.length = 0;
              newFormatStates.push(this.parser.getFormatStateByNode(renderModel.replaceElement));
              vNode.wrapElement = vNode.slotElement = renderModel.replaceElement;
              vNode.wrapElement[VIRTUAL_NODE] = vNode;
              return renderModel.replaceElement;
            } else if (renderModel instanceof ChildSlotModel) {
              if (node) {
                node.appendChild(renderModel.slotElement);
              } else {
                vNode.wrapElement = renderModel.slotElement;
              }
              newFormatStates.push(this.parser.getFormatStateByNode(renderModel.slotElement));
              vNode.slotElement = renderModel.slotElement;
              vNode.slotElement[VIRTUAL_NODE] = vNode;
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
            switch (item.handler.priority) {
              case Priority.Default:
              case Priority.Block:
              case Priority.BlockStyle:
                vNode.context.mergeFormat(new BlockFormat({
                  context: vNode.context,
                  ...item
                }), false);
                break;
              case Priority.Inline:
              case Priority.Property:
                vNode.context.mergeFormat(new InlineFormat({
                  startIndex: vNode.startIndex,
                  endIndex: vNode.endIndex,
                  context: vNode.context,
                  ...item
                }), false);
                break;
            }
          })
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
        vNode.wrapElement = (oldVNode as VInlineNode).wrapElement;
        vNode.slotElement = (oldVNode as VInlineNode).slotElement;
        (oldVNode as VInlineNode).wrapElement = (oldVNode as VInlineNode).slotElement = null;
      }

      vNode.children.forEach(childVNode => {
        if (childVNode.context !== vNode.context) {
          // childVNode.context.useContents(new Contents());
          childVNode.context.cleanFormats();
        }

        this.diffAndUpdateView(
          childVNode,
          (oldVNode as VBlockNode)?.children.shift(),
          vNode.slotElement as HTMLElement || host);
      });
      if ((oldVNode as VBlockNode)?.children.length) {
        (oldVNode as VBlockNode)?.children.forEach(i => i.destroyView());
      }
    } else if (vNode instanceof VTextNode) {
      this.renderTextNode(vNode, oldVNode, host);
    } else if (vNode instanceof VMediaNode) {
      // host.appendChild(vNode.)
    }
  }

  private renderTextNode(vNode: VTextNode, oldVNode: VNode, host: HTMLElement) {
    if (!this.diff(vNode, oldVNode)) {
      const str = vNode.text.replace(/\s\s+/g, str => {
        return ' ' + Array.from({
          length: str.length - 1
        }).fill('\u00a0').join('');
      }).replace(/\s$/, '\u00a0');
      if (oldVNode instanceof VTextNode) {
        vNode.nativeElement = oldVNode.nativeElement;
        vNode.nativeElement.textContent = str;
        oldVNode.nativeElement = null;
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
      (oldVNode as VTextNode).nativeElement = null;
    }
  }

  private diff(newNode: VNode, oldNode: VNode): boolean {
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
    if (newNode.formats.length !== (oldNode as VBlockNode).formats.length) {
      return false;
    }
    for (let i = 0; i < newNode.formats.length; i++) {
      const newFormat = newNode.formats[i];
      const oldFormat = (oldNode as VBlockNode).formats[i];
      if (!oldFormat) {
        return false;
      }
      if (newFormat.state !== oldFormat.state || newFormat.handler !== newFormat.handler || !newFormat.cacheData.equal(oldFormat.cacheData)) {
        return false;
      }
    }
    return true;
  }
}
