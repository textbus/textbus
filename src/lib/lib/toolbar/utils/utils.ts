import { dtd } from '../../dtd';

export function matchContainerByTagName(node: Node, tagName: string, scope: Node) {
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

export function findEmptyContainer(node: Node): Node {
  if ((node.parentNode as HTMLElement).innerText) {
    return node;
  }
  return findEmptyContainer(node.parentNode);
}

export function findElementByTagName(nodes: Node[], tagName: string | string[]): HTMLElement {
  if (!Array.isArray(tagName)) {
    tagName = [tagName];
  }
  const regs = tagName.map(tagName => new RegExp(`^${tagName}$`, 'i'));
  for (const node of nodes) {
    if (node.nodeType === 1 && regs.map(reg => reg.test((node as HTMLElement).tagName)).indexOf(true) > -1) {
      return node as HTMLElement;
    }
  }
  return null;
}

export function createContainerByDtdRule(context: Document, tagName: string): { newNode: HTMLElement, contentsContainer: HTMLElement } {
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

export function findBlockContainer(node: Node, scope: Node): Node {
  if (node === scope) {
    return node;
  }

  if (node.nodeType === 3) {
    return findBlockContainer(node.parentNode, scope);
  }
  if (node.nodeType === 1) {
    const tagName = (node as HTMLElement).tagName.toLowerCase();
    if (dtd[tagName].display === 'block') {
      return node;
    }
    if (node.parentNode) {
      return findBlockContainer(node.parentNode, scope);
    }
  }
  return scope;
}

export function takeOffWrapper(el: Element) {
  const fragment = document.createDocumentFragment();
  Array.from(el.childNodes).forEach(item => {
    fragment.appendChild(item);
  });
  el.parentNode.replaceChild(fragment, el);
}
