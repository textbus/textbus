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

export const vNodeNextAccessToken = Symbol('NextNodeAccessToken');

export abstract class VNode {
  [vNodeNextAccessToken]: VNode | null;

  protected constructor() {
    this[vNodeNextAccessToken] = this;
  }

  abstract clone(): any;

  /**
   * 判断一个虚拟 DOM 节点是否和自己相等。
   * @param vNode
   */
  equal(vNode: VNode): boolean {
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

    if (right instanceof VTextNode) {
      return (left as VTextNode).textContent === right.textContent;
    }
    return false;
  }
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

/**
 * 虚拟文本节点。
 */
export class VTextNode extends VNode {
  constructor(public readonly textContent: string = '') {
    super()
  }

  clone() {
    return new VTextNode(this.textContent);
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
export class VElement extends VNode {
  readonly events = new EventEmitter();
  readonly childNodes: Array<VElement | VTextNode> = [];
  readonly attrs = new Map<string, string | number | boolean>();
  readonly styles = new Map<string, string | number>();
  readonly classes: string[] = [];

  constructor(public tagName: string, options?: VElementOption) {
    super();
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
        this.childNodes.push(...options.childNodes);
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
    return new VElement(this.tagName, {
      classes: [...this.classes],
      attrs,
      styles,
      childNodes: this.childNodes.map(i => i.clone())
    })
  }

  /**
   * 在最后位置添加一个子节点。
   * @param newChild
   */
  appendChild(newChild: VElement | VTextNode) {
    this.childNodes.push(newChild);
    return newChild;
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
      childNodes: this.childNodes.map(c => {
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
