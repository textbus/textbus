import { BlockToken, InlineToken, MediaToken, TextToken, Token } from './tokens';
import { Parser, FormatDelta } from '../parser/parser';
import { ChildSlotModel, ReplaceModel } from '../commands/commander';
import { TBUS_TOKEN } from '../parser/help';
import { BlockFormat, InlineFormat, SingleFormat } from '../parser/format';
import { Priority } from '../toolbar/help';
import { VElement } from './element';
import { ElementRef, NodeRef, Renderer, TextRef } from './renderer';

/**
 * diff 算法类，用于比较新老 Token 树，并在找出差异更新对应 NativeElement
 */
export class Differ {
  private oldToken: BlockToken;

  constructor(private parser: Parser, private renderer: Renderer) {
  }

  /**
   * 把 Token 树渲染到指定容器
   * @param newToken 新的 Token
   * @param host 渲染容器
   */
  render(newToken: BlockToken, host: ElementRef) {
    newToken.children.forEach((vNode, index) => {
      const old = this?.oldToken?.children.shift();
      this.diffAndUpdateView(vNode, old, host, index);
    });
    this?.oldToken?.children.forEach(i => i.destroyView());
    this.oldToken = newToken;
    host.nativeElement[TBUS_TOKEN] = newToken;
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
  private diffAndUpdateView(token: Token, oldToken: Token, host: ElementRef, position: number): NodeRef {
    if (token instanceof BlockToken || token instanceof InlineToken) {
      return this.renderContainerNode(token, oldToken, host, position);
    } else if (token instanceof TextToken) {
      return this.renderTextNode(token, oldToken, host, position);
    } else if (token instanceof MediaToken) {
      return this.renderMediaNode(token, oldToken, host, position);
    }
  }

  /**
   * 渲染新的 Media 节点，如 br、img
   * @param token
   * @param oldToken
   * @param host
   * @param position
   */
  private renderMediaNode(token: MediaToken, oldToken: Token, host: ElementRef, position: number): ElementRef {
    if (!Differ.diff(token, oldToken)) {
      let vElement = new VElement(token.data.tagName);
      token.formats.reduce((node, next) => {
        if (next.handler) {
          const renderModel = next.handler.execCommand.render(next.state, next.abstractData, node);
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
      token.elementRef = this.renderer.createElement(vElement);
      if (token.elementRef) {
        this.parser.createFormatDeltasByHTMLElement(token.elementRef.nativeElement as HTMLElement).forEach(f => {
          token.data.mergeFormat(new SingleFormat({
            context: token.data,
            ...f
          }));
        });
        token.elementRef.nativeElement[TBUS_TOKEN] = token;
        host.insert(token.elementRef, position);
      }
      if (oldToken instanceof MediaToken) {
        token.context.viewSynced();
      }
      if (oldToken) {
        oldToken.destroyView();
      }
    } else {
      token.elementRef = (oldToken as MediaToken).elementRef;
      token.elementRef && (token.elementRef.nativeElement[TBUS_TOKEN] = token);
      host.insert(token.elementRef, position);
      (oldToken as MediaToken).elementRef = null;
    }
    return token.elementRef;
  }

  /**
   * 渲染容器节点
   * 当节点为 Block 节点时，会清空当前 Fragment 的 FormatMap
   * 并根据渲染后的结果重新生成 FormatMap，以保持和视图同步
   * @param token
   * @param oldToken
   * @param host
   * @param position
   */
  private renderContainerNode(token: BlockToken | InlineToken, oldToken: Token, host: ElementRef, position: number) {
    if (token instanceof BlockToken) {
      token.context.cleanFormats();
    }
    if (!Differ.diff(token, oldToken)) {
      let wrapElement: VElement;
      let slotElement: VElement;
      token.formats.reduce((vEle, next) => {
        if (next.handler) {
          const renderModel = next.handler.execCommand.render(next.state, next.abstractData, vEle);
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
        host.insert(token.wrapElement, position);
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
      token.wrapElement && (token.wrapElement.nativeElement[TBUS_TOKEN] = token);
      token.slotElement && (token.slotElement.nativeElement[TBUS_TOKEN] = token);
      if (token.wrapElement) {
        // 只有当有容器时，才插入，
        // 当继承样式时，如 h1 ~ h6 下的加粗，没有容器
        host.insert(token.wrapElement, position);
      }
      token.formats.forEach(format => {
        this.parser.createFormatDeltasByAbstractData(format.abstractData).forEach(f => {
          if ([Priority.Block, Priority.Default, Priority.BlockStyle].includes(f.handler.priority)) {
            token.context.mergeFormat(new BlockFormat({
              ...f,
              context: format.context
            }), true);
          } else {
            token.context.mergeFormat(new InlineFormat({
              ...f,
              startIndex: format.startIndex,
              endIndex: format.endIndex,
              context: format.context
            }), true);
          }
        })
      });

      (oldToken as InlineToken).wrapElement = (oldToken as InlineToken).slotElement = null;
    }

    token.children.forEach((childVNode, index) => {
      const firstChild = (oldToken instanceof BlockToken || oldToken instanceof InlineToken) ?
        oldToken.children.shift() : null;
      if (token.slotElement) {
        this.diffAndUpdateView(childVNode, firstChild, token.slotElement, index);
      } else {
        this.diffAndUpdateView(childVNode, firstChild, host, position + index);
      }
    });
    if ((oldToken instanceof BlockToken || oldToken instanceof InlineToken)) {
      oldToken.children.forEach(i => i.destroyView());
    }
    return token.wrapElement;
  }

  /**
   * 渲染文本节点
   * @param token
   * @param oldVNode
   * @param host
   * @param position
   */
  private renderTextNode(token: TextToken, oldVNode: Token, host: ElementRef, position: number): TextRef {
    if (!Differ.diff(token, oldVNode)) {
      let currentNode = this.renderer.createTextNode(token.text);
      if (oldVNode instanceof TextToken) {
        token.elementRef = oldVNode.elementRef;
        token.elementRef.nativeElement[TBUS_TOKEN] = token;
        token.elementRef.textContent = currentNode.textContent;
        oldVNode.elementRef = null;
        host.insert(token.elementRef, position);
      } else {
        currentNode.nativeElement[TBUS_TOKEN] = token;
        token.elementRef = currentNode;
        host.insert(currentNode, position);
        if (oldVNode) {
          oldVNode.destroyView();
        }
      }
    } else {
      token.elementRef = (oldVNode as TextToken).elementRef;
      token.elementRef.nativeElement[TBUS_TOKEN] = token;
      host.insert(token.elementRef, position);
      (oldVNode as TextToken).elementRef = null;
    }
    return token.elementRef;
  }

  /**
   * 比较两个节点是否相等，并返回布尔值
   * @param token
   * @param oldToken
   */
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
        !newFormat.abstractData.equal(oldFormat.abstractData)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 渲染 InlineFormat 或 BlockFormat 生成的虚拟 VElement 树，并返回最外层节点和最内层节点
   * @param vElement
   * @param token
   */
  private createNativeElementsTree(vElement: VElement,
                                   token: BlockToken | InlineToken): { wrap: ElementRef, slot: ElementRef } {
    const wrap = this.renderer.createElement(vElement);
    wrap.nativeElement[TBUS_TOKEN] = token;
    const newFormatStates = this.parser.createFormatDeltasByHTMLElement(wrap.nativeElement as HTMLElement);
    this.mergeFormat(token, newFormatStates);

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

  private mergeFormat(token: Token, formats: FormatDelta[]) {
    formats.forEach(format => {
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
  }
}
