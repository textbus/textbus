import { EventEmitter } from './events';

/**
 * 虚拟 DOM 节点的字面量表示。
 */
export interface VElementLiteral {
  tagName: string;
  styles: { [key: string]: any },
  attrs: { [key: string]: any },
  classes: string[];
  childNodes: Array<VElementLiteral | string>;
}


function equalMap(left: Map<string, string | number | boolean>, right: Map<string, string | number | boolean>) {
  if (left === right || !left === true && !right === true) {
    return true;
  }
  if (!left !== !right || left.size !== right.size) {
    return false;
  }
  return Array.from(left.keys()).reduce((v, key) => {
    return v && left.get(key) === right.get(key);
  }, true);
}

function equalClasses(left: string[], right: string[]) {
  if (left === right) {
    return true;
  }
  if (left.length !== right.length) {
    return false;
  }

  for (const k of left) {
    if (!right.includes(k)) {
      return false;
    }
  }
  return true;
}
const parentNode = Symbol('parentNode');
/**
 * 虚拟文本节点。
 */
export class VTextNode {
  [parentNode]: VElement | null;

  constructor(public readonly textContent: string = '') {
  }

  clone() {
    return new VTextNode(this.textContent);
  }

  equal(vNode: VElement | VTextNode): boolean {
    if (vNode === this) {
      return true;
    }
    if (vNode instanceof VTextNode) {
      return vNode.textContent === this.textContent;
    }
    return false;
  }
}

/**
 * 配置虚拟 DOM 节点的属性选项。
 */
export interface VElementOption {
  attrs?: { [key: string]: boolean | string | number };
  styles?: { [key: string]: string | number };
  classes?: string[];
  childNodes?: Array<VElement | VTextNode>;
}

/**
 * 虚拟 DOM 节点
 */
export class VElement {
  [parentNode]: VElement | null;
  readonly events = new EventEmitter();
  readonly attrs = new Map<string, string | number | boolean>();
  readonly styles = new Map<string, string | number>();
  readonly classes: string[] = [];

  get parentNode() {
    return this[parentNode];
  }

  get children() {
    return this._childNodes.map(i => i);
  }

  private _childNodes: Array<VElement | VTextNode> = [];

  constructor(public tagName: string, options?: VElementOption) {
    if (options) {
      if (options.attrs) {
        Object.keys(options.attrs).forEach(key => this.attrs.set(key, options.attrs[key]));
      }
      if (options.styles) {
        Object.keys(options.styles).forEach(key => this.styles.set(key, options.styles[key]));
      }
      if (options.classes) {
        this.classes.push(...options.classes);
      }
      if (options.childNodes) {
        this.appendChild(...options.childNodes);
      }
    }
  }

  clone(): VElement {
    const attrs: { [key: string]: boolean | string | number } = {};
    const styles: { [key: string]: string | number } = {};
    this.attrs.forEach(((value, key) => {
      attrs[key] = value
    }));
    this.styles.forEach((value, key) => {
      styles[key] = value;
    })
    const el = new VElement(this.tagName, {
      classes: [...this.classes],
      attrs,
      styles,
      childNodes: this._childNodes.map(i => i.clone())
    });
    (el as { events: EventEmitter }).events = this.events;
    return el;
  }

  /**
   * 在最后位置添加一个子节点。
   * @param newNodes
   */
  appendChild(...newNodes: Array<VElement | VTextNode>) {
    newNodes.forEach(node => {
      node[parentNode] = this;
      this._childNodes.push(node);
    })
  }

  removeChild(node: VTextNode | VElement) {
    const index = this._childNodes.indexOf(node);
    if (index > -1) {
      this._childNodes.splice(index, 1);
      node[parentNode] = null;
    }
    throw new Error('要删除的节点不是当前节点的子级！');
  }

  replaceChild(newNode: VElement | VTextNode, oldNode: VElement | VTextNode) {
    const index = this._childNodes.indexOf(oldNode);
    if (index > -1) {
      this._childNodes.splice(index, 1, newNode);
      oldNode[parentNode] = null;
      newNode[parentNode] = this;
      return;
    }
    throw new Error('要替换的节点不是当前节点的子级！');
  }

  removeLastChild() {
    const node = this._childNodes.pop();
    if (node) {
      node[parentNode] = null;
    }
    return node;
  }

  removeFirstChild() {
    const node = this._childNodes.shift();
    if (node) {
      node[parentNode] = null;
    }
    return node;
  }

  /**
   * 判断一个虚拟 DOM 节点是否和自己相等。
   * @param vNode
   */
  equal(vNode: VElement | VTextNode): boolean {
    if (vNode === this) {
      return true;
    }
    if (!vNode) {
      return false;
    }
    const left = vNode;
    const right = this;

    if (left instanceof VElement) {
      if (right instanceof VElement) {
        return left.tagName == right.tagName &&
          equalMap(left.attrs, right.attrs) &&
          equalMap(left.styles, right.styles) &&
          equalClasses(left.classes, right.classes);
      }
      return false
    }

    return false;
  }

  /**
   * 把当前虚拟 DOM 节点转换为 JSON 字面量。
   */
  toJSON(): VElementLiteral {
    return {
      tagName: this.tagName,
      styles: VElement.mapToJSON(this.styles),
      attrs: VElement.mapToJSON(this.attrs),
      classes: this.classes.map(i => i),
      childNodes: this._childNodes.map(c => {
        if (c instanceof VElement) {
          return c.toJSON();
        }
        return c.textContent;
      })
    }
  }

  private static mapToJSON(map: Map<string, any>) {
    const obj = {};
    map.forEach((value, key) => {
      obj[key] = value
    });
    return obj;
  }
}
