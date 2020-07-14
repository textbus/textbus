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

/**
 * 虚拟文本节点。
 */
export class VTextNode {
  constructor(public readonly textContent: string = '') {
  }
}

/**
 * 配置虚拟 DOM 节点的属性选项。
 */
export interface VElementOption {
  attrs?: { [key: string]: boolean | string | number };
  styles?: { [key: string]: string | number };
  classes?: string[];
}

/**
 * 虚拟 DOM 节点
 */
export class VElement {
  readonly events = new EventEmitter();
  readonly childNodes: Array<VElement | VTextNode> = [];
  readonly attrs = new Map<string, string | number | boolean>();
  readonly styles = new Map<string, string | number>();
  readonly classes: string[] = [];

  constructor(public tagName: string, options?: VElementOption) {
    if (options) {
      if (options.attrs) {
        Object.keys(options.attrs).forEach(key => this.attrs.set(key, options.attrs[key]));
      }
      if (options.styles) {
        Object.keys(options.styles).forEach(key => this.styles.set(key, options.styles[key]));
      }
      if (options.classes) {
        options.classes.forEach(i => this.classes.push(i));
      }
    }
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
   * 判断一个虚拟 DOM 节点是否和自己相等。
   * @param vElement
   */
  equal(vElement: VElement) {
    if (vElement === this) {
      return true;
    }
    if (!vElement) {
      return false;
    }
    const left = vElement;
    const right = this;
    return left.tagName == right.tagName &&
      VElement.equalMap(left.attrs, right.attrs) &&
      VElement.equalMap(left.styles, right.styles) &&
      VElement.equalClasses(left.classes, right.classes);
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

  private static equalMap(left: Map<string, string | number | boolean>, right: Map<string, string | number | boolean>) {
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

  private static equalClasses(left: string[], right: string[]) {
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
}
