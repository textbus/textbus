import { dtd } from '../../editor/dtd';
import { MatchStatus } from '../../matcher';
import { TBRange } from '../../range';
import { Editor } from '../../editor/editor';

export abstract class Formatter {
  abstract format(range: TBRange, editor: Editor, matchStatus: MatchStatus): void;

  matchContainerByTagName(node: Node, tagName: string, scope: Node) {
    while (node) {
      if (node === scope) {
        return null;
      }
      if (node.nodeType === 1 && (node as HTMLElement).tagName.toLowerCase() === tagName) {
        return node;
      }
      node = node.parentNode as HTMLElement;
    }
    return null;
  }

  findEmptyContainer(node: Node): Node {
    if ((node.parentNode as HTMLElement).innerText) {
      return node;
    }
    return this.findEmptyContainer(node.parentNode);
  }

  createContainerByDtdRule(context: Document, tagName: string): { newNode: HTMLElement, contentsContainer: HTMLElement } {
    const wrapper = context.createElement(tagName);
    let container = wrapper;
    while (dtd[container.tagName.toLowerCase()].limitChildren) {
      const child = context.createElement(dtd[container.tagName.toLowerCase()].limitChildren[0]);
      container.appendChild(child);
      container = child;
    }
    return {
      contentsContainer: wrapper,
      newNode: container
    };
  }

  findBlockContainer(node: Node, scope: Node): Node {
    if (node === scope) {
      return node;
    }

    if (node.nodeType === 3) {
      return this.findBlockContainer(node.parentNode, scope);
    }
    if (node.nodeType === 1) {
      const tagName = (node as HTMLElement).tagName.toLowerCase();
      if (dtd[tagName].display === 'block') {
        return node;
      }
      if (node.parentNode) {
        return this.findBlockContainer(node.parentNode, scope);
      }
    }
    return scope;
  }

  takeOffWrapper(context: Document, el: Element) {
    const fragment = context.createDocumentFragment();
    Array.from(el.childNodes).forEach(item => {
      fragment.appendChild(item);
    });
    el.parentNode.replaceChild(fragment, el);
  }
}
