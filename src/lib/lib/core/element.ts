import { EventEmitter } from './events';

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
