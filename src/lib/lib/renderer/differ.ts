import { BlockToken, InlineToken, Token, TextToken, MediaToken } from './tokens';
import { Parser } from '../parser/parser';
import { ChildSlotModel, ReplaceModel } from '../commands/commander';
import { TBUS_TOKEN } from '../parser/help';
import { BlockFormat, InlineFormat, SingleFormat } from '../parser/format';
import { Priority } from '../toolbar/help';
import { VElement } from './element';
import { NativeElement, NativeNode, NativeText, Renderer } from './help';

export class Differ {
  private oldToken: BlockToken;

  constructor(private parser: Parser, private renderer: Renderer) {
  }

  render(newToken: BlockToken, host: NativeElement) {
    newToken.children.forEach((vNode, index) => {
      const old = this?.oldToken?.children.shift();
      this.diffAndUpdateView(vNode, old, host, index);
    });
    this?.oldToken?.children.forEach(i => i.destroyView());
    this.oldToken = newToken;
    host[TBUS_TOKEN] = newToken;
    newToken.wrapElement = host;
    newToken.slotElement = host;
  }

  /**
   * 根据虚拟 DOM 树和内容生成真实 DOM
   * @param token
   * @param oldToken
   * @param host
   * @param position
   */
  private diffAndUpdateView(token: Token, oldToken: Token, host: NativeElement, position: number): NativeNode {
    if (token instanceof BlockToken || token instanceof InlineToken) {
      return this.renderContainerNode(token, oldToken, host, position);
    } else if (token instanceof TextToken) {
      return this.renderTextNode(token, oldToken, host, position);
    } else if (token instanceof MediaToken) {
      return this.renderMediaNode(token, oldToken, host, position);
    }
  }

  private renderMediaNode(token: MediaToken, oldToken: Token, host: NativeElement, position: number): NativeElement {
    if (!Differ.diff(token, oldToken)) {
      let vElement = new VElement(token.data.tagName);
      token.formats.reduce((node, next) => {
        if (next.handler) {
          const renderModel = next.handler.execCommand.render(next.state, node, next.cacheData);
          if (renderModel instanceof ReplaceModel) {
            vElement = renderModel.replaceElement;
            return renderModel.replaceElement;
          } else if (renderModel instanceof ChildSlotModel) {
            vElement = renderModel.slotElement;
            return renderModel.slotElement;
          }
        }
        return node;
      }, vElement);
      token.nativeElement = this.renderer.createElement(vElement);
      if (token.nativeElement) {
        this.parser.getFormatStateByNode(token.nativeElement.elementRef as HTMLElement).forEach(f => {
          token.data.mergeFormat(new SingleFormat({
            context: token.data,
            ...f
          }));
        });
        token.nativeElement[TBUS_TOKEN] = token;
        host.append(token.nativeElement);
      }
      if (oldToken instanceof MediaToken) {
        token.context.viewSynced();
      }
      if (oldToken) {
        oldToken.destroyView();
      }
    } else {
      token.nativeElement = (oldToken as MediaToken).nativeElement;
      token.nativeElement && (token.nativeElement[TBUS_TOKEN] = token);
      Differ.insertNode(position, token.nativeElement, host);
      (oldToken as MediaToken).nativeElement = null;
    }
    return token.nativeElement;
  }

  private renderContainerNode(token: BlockToken | InlineToken, oldToken: Token, host: NativeElement, position: number) {
    if (!Differ.diff(token, oldToken)) {
      let wrapElement: VElement;
      let slotElement: VElement;
      token.formats.reduce((vEle, next) => {
        if (next.handler) {
          const renderModel = next.handler.execCommand.render(next.state, vEle, next.cacheData);
          if (renderModel instanceof ReplaceModel) {
            wrapElement = slotElement = renderModel.replaceElement;
            return renderModel.replaceElement;
          } else if (renderModel instanceof ChildSlotModel) {
            if (vEle) {
              vEle.appendChild(renderModel.slotElement);
            } else {
              wrapElement = renderModel.slotElement;
            }
            slotElement = renderModel.slotElement;
            return renderModel.slotElement;
          }
        }
        return vEle;
      }, (null as VElement));
      if (wrapElement) {
        const {wrap, slot} = this.createNativeElementsTree(wrapElement, token);
        token.wrapElement = wrap;
        token.slotElement = slot;
      }

      if (token.wrapElement) {
        Differ.insertNode(position, token.wrapElement, host);
      }
      if (oldToken instanceof BlockToken) {
        token.context.viewSynced();
      }
      if (oldToken) {
        oldToken.destroyView();
      }
    } else {
      // if (vNode instanceof VBlockNode && vNode === oldVNode) {
      //   return oldVNode.wrapElement;
      // }
      token.wrapElement = (oldToken as InlineToken).wrapElement;
      token.slotElement = (oldToken as InlineToken).slotElement;
      token.wrapElement && (token.wrapElement[TBUS_TOKEN] = token);
      token.slotElement && (token.slotElement[TBUS_TOKEN] = token);
      Differ.insertNode(position, token.wrapElement, host);
      (oldToken as InlineToken).wrapElement = (oldToken as InlineToken).slotElement = null;
    }

    token.children.forEach((childVNode, index) => {
      this.diffAndUpdateView(
        childVNode,
        (oldToken instanceof BlockToken || oldToken instanceof InlineToken) ? oldToken.children.shift() : null,
        token.slotElement || host, index);
    });
    if ((oldToken instanceof BlockToken || oldToken instanceof InlineToken)) {
      oldToken.children.forEach(i => i.destroyView());
    }
    return token.wrapElement;
  }

  private renderTextNode(token: TextToken, oldVNode: Token, host: NativeElement, position: number): NativeText {
    if (!Differ.diff(token, oldVNode)) {
      let currentNode = this.renderer.createTextNode(token.text);
      if (oldVNode instanceof TextToken) {
        token.nativeElement = oldVNode.nativeElement;
        token.nativeElement[TBUS_TOKEN] = token;
        token.nativeElement.textContent = currentNode.textContent;
        oldVNode.nativeElement = null;
        Differ.insertNode(position, token.nativeElement, host);
      } else {
        currentNode[TBUS_TOKEN] = token;
        token.nativeElement = currentNode;
        host.append(currentNode);
        if (oldVNode) {
          oldVNode.destroyView();
        }
      }
    } else {
      token.nativeElement = (oldVNode as TextToken).nativeElement;
      token.nativeElement[TBUS_TOKEN] = token;
      Differ.insertNode(position, token.nativeElement, host);
      (oldVNode as TextToken).nativeElement = null;
    }
    return token.nativeElement;
  }

  private static insertNode(position: number, newNode: NativeElement | NativeText, host: NativeElement) {
    host.insert(newNode, position);
  }

  private static diff(token: Token, oldToken: Token): boolean {
    if (token === oldToken) {
      return true;
    }
    const sameType = (token instanceof BlockToken && oldToken instanceof BlockToken) ||
      (token instanceof InlineToken && oldToken instanceof InlineToken) ||
      (token instanceof MediaToken && oldToken instanceof MediaToken) ||
      (token instanceof TextToken && oldToken instanceof TextToken);

    if (!sameType) {
      return false;
    }
    if (token instanceof TextToken) {
      return token.text === (oldToken as TextToken).text;
    }

    if (token instanceof MediaToken) {
      if (token.data.tagName !== (oldToken as MediaToken).data.tagName) {
        return false;
      }
    }

    if (token.formats.length !== (oldToken as BlockToken).formats.length) {
      return false;
    }
    for (let i = 0; i < token.formats.length; i++) {
      const newFormat = token.formats[i];
      const oldFormat = (oldToken as BlockToken).formats[i];
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

  private createNativeElementsTree(vElement: VElement,
                                   token: BlockToken | InlineToken): { wrap: NativeElement, slot: NativeElement } {
    const wrap = this.renderer.createElement(vElement);
    wrap[TBUS_TOKEN] = token;
    const newFormatStates = this.parser.getFormatStateByNode(wrap.elementRef);
    newFormatStates.forEach(format => {
      switch (format.handler.priority) {
        case Priority.Default:
        case Priority.Block:
        case Priority.BlockStyle:
          token.context.mergeFormat(new BlockFormat({
            context: token.context,
            ...format
          }), true);
          break;
        case Priority.Inline:
        case Priority.Property:
          token.context.mergeFormat(new InlineFormat({
            startIndex: token.startIndex,
            endIndex: token instanceof BlockToken ? token.context.contentLength : token.endIndex,
            context: token.context,
            ...format
          }), true);
          break;
      }
    });
    let slot = wrap;
    vElement.childNodes.forEach(child => {
      const c = this.createNativeElementsTree(child, token);
      slot = c.slot;
      wrap.append(c.wrap);
    });
    return {
      wrap,
      slot
    }
  }
}
