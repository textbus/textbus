import { EventEmitter } from './events';

export interface VElementLiteral {
  tagName: string;
  styles: { [key: string]: any },
  attrs: { [key: string]: any },
  classes: string[];
  childNodes: Array<VElementLiteral | string>;
}

export class VTextNode {
  constructor(public readonly textContent: string = '') {
  }
}

export interface VElementOption {
  attrs?: { [key: string]: boolean | string | number };
  styles?: { [key: string]: string | number };
  classes?: string[];
}

export class VElement {
  readonly events = new EventEmitter();
  readonly childNodes: Array<VElement | VTextNode> = [];
  readonly attrs = new Map<string, string | number | boolean>();
  readonly styles = new Map<string, string | number>();
  readonly classes: string[] = [];

  private listeners: Array<{ type: string, listener: (event: Event) => any }> = [];

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
      VElement.equalMap(left.styles, right.styles) &&
      VElement.equalClasses(left.classes, right.classes);
  }

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

  on(type: string, listener: (event: Event) => any) {
    this.listeners.push({
      type,
      listener
    });
  }

  bindEventToNativeElement(el: Node) {
    this.listeners.forEach(i => {
      el.addEventListener(i.type, i.listener);
    });
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
