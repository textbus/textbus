import { EventEmitter } from './events';

export interface VElementLiteral {
  tagName: string;
  styles: { [key: string]: any },
  attrs: { [key: string]: any },
  childNodes: Array<VElementLiteral | string>;
}

export class VTextNode {
  constructor(public readonly textContent: string = '') {
  }
}

export class VElement {
  readonly events = new EventEmitter();
  readonly childNodes: Array<VElement | VTextNode> = [];
  readonly attrs = new Map<string, string | number | boolean>();
  readonly styles = new Map<string, string | number>();

  constructor(public tagName: string) {
  }

  appendChild(newChild: VElement | VTextNode) {
    this.childNodes.push(newChild);
    return newChild;
  }

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
      VElement.equalMap(left.styles, right.styles);
  }

  toJSON(): VElementLiteral {
    return {
      tagName: this.tagName,
      styles: VElement.mapToJSON(this.styles),
      attrs: VElement.mapToJSON(this.attrs),
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
}
