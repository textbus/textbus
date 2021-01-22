/* eslint-disable */

/**
 * 虚拟 DOM 节点的字面量表示。
 */
declare interface VElementLiteral {
  tagName: string;
  styles: { [key: string]: any },
  attrs: { [key: string]: any },
  classes: string[];
  childNodes: Array<VElementLiteral | string>;
}

declare interface VTextNode {
  textContent: string;
  clone(): VTextNode;
}

declare interface VElement {
  tagName: string;
  readonly attrs:Map<string, string | number | boolean>;
  readonly styles: Map<string, string | number>;
  readonly classes: string[];
  readonly parentNode: VElement;
  readonly childNodes: Array<VElement|VTextNode>;

  clone(): VElement;
  appendChild(...newNodes: Array<VElement | VTextNode>): void;
  removeChild(node: VTextNode | VElement): void;
  replaceChild(newNode: VElement | VTextNode, oldNode: VElement | VTextNode): void;
  toJSON(): VElementLiteral;
}

declare namespace JSX {
  // abstract class Element extends VElement {
  // }

  interface IntrinsicElements {
    [elemName: string]: any
  }
}
/* eslint-enable */
