import { makeError } from '../_utils/make-error';
import { Observable, Subject } from 'rxjs';

const parentNode = Symbol('parentNode');

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
  [parentNode]: VElement | null;

  get parentNode() {
    return this[parentNode];
  }

  constructor(public readonly textContent: string = '') {
  }

  clone() {
    return new VTextNode(this.textContent);
  }
}

export interface VElementListeners {
  [listenKey: string]: <T extends Event>(ev: T) => any;
}

export interface VElementRenderFn {
  (props: { [key: string]: any }): VElement;
}

/**
 * 配置虚拟 DOM 节点的属性选项。
 */
export interface VElementOption {
  attrs?: { [key: string]: boolean | string | number };
  styles?: { [key: string]: string | number };
  classes?: string[];
  childNodes?: Array<VElement | VTextNode>;
  on?: VElementListeners;
}

const vElementErrorFn = makeError('VElement');

/**
 * 虚拟 DOM 节点
 */
export class VElement {
  static createElement(tagName: string | VElementRenderFn,
                       attrs: { [key: string]: any },
                       ...children: Array<VElement | string | number | boolean>) {
    if (typeof tagName === 'function') {
      return tagName({
        ...attrs,
        children
      })
    }
    attrs = attrs || {};
    const className = (attrs.class || '').trim();
    const classes = className ? className.split(/\s+/g) : [];

    Reflect.deleteProperty(attrs, 'className');

    const style = attrs.style || '';
    let styles: { [key: string]: string | number };
    if (style && typeof style === 'string') {
      styles = {};
      style.split(';').map(s => s.split(':')).forEach(v => {
        styles[v[0].trim()] = v[1].trim();
      })
    } else {
      styles = style
    }

    Reflect.deleteProperty(attrs, 'style');

    const listeners: VElementListeners = {};
    const attrs2: { [key: string]: string | boolean | number } = {};

    Object.keys(attrs).forEach(key => {
      if (/^on[A-Z]/.test(key)) {
        listeners[key.replace(/^on/, '').toLowerCase()] = attrs[key];
      } else {
        attrs2[key] = attrs[key];
      }
    })
    return new VElement(tagName, {
      styles,
      attrs: attrs2,
      classes,
      on: listeners,
      childNodes: children.filter(i => i !== false).map(i => {
        if (i instanceof VElement) {
          return i;
        }
        return new VTextNode(i + '');
      }) as Array<VElement | VTextNode>
    })
  }

  [parentNode]: VElement | null = null;
  readonly attrs = new Map<string, string | number | boolean>();
  readonly styles = new Map<string, string | number>();
  readonly classes: string[] = [];

  get parentNode() {
    return this[parentNode];
  }

  get childNodes() {
    return this._childNodes.map(i => i);
  }

  onDestroy: Observable<void>;

  private _childNodes: Array<VElement | VTextNode> = [];
  private listeners: VElementListeners;
  private unbindFns: Array<() => void> = [];
  private destroyEvent = new Subject<void>();

  constructor(public tagName: string, options?: VElementOption) {
    this.onDestroy = this.destroyEvent.asObservable();
    if (options) {
      if (options.attrs) {
        Object.keys(options.attrs).forEach(key => {
          const value = options.attrs[key];
          if (value !== null && typeof value !== 'undefined') {
            this.attrs.set(key, options.attrs[key])
          }
        });
      }
      if (options.styles) {
        Object.keys(options.styles).forEach(key => {
          const value = options.styles[key];
          if (value !== null && typeof value !== 'undefined') {
            this.styles.set(key, options.styles[key])
          }
        });
      }
      if (options.classes) {
        this.classes.push(...options.classes);
      }
      if (options.childNodes) {
        this.appendChild(...options.childNodes);
      }
      this.listeners = options.on || {};
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
      childNodes: this._childNodes.map(i => i.clone())
    });
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
    throw vElementErrorFn('node to be deleted is not a child of the current node.');
  }

  replaceChild(newNode: VElement | VTextNode, oldNode: VElement | VTextNode) {
    const index = this._childNodes.indexOf(oldNode);
    if (index > -1) {
      this._childNodes.splice(index, 1, newNode);
      oldNode[parentNode] = null;
      newNode[parentNode] = this;
      return;
    }
    throw vElementErrorFn('node to be replaced is not a child of the current node.');
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

  onRendered(nativeNode: HTMLElement) {
    Object.keys(this.listeners || {}).forEach(listenKey => {
      const callback = this.listeners[listenKey];
      if (typeof callback === 'function') {
        nativeNode.addEventListener(listenKey, this.listeners[listenKey]);
        this.unbindFns.push(function () {
          nativeNode.removeEventListener(listenKey, callback);
        })
      }
    })
  }

  destroy() {
    this.unbindFns.forEach(i => i());
    this.destroyEvent.next();
  }

  private static mapToJSON(map: Map<string, any>) {
    const obj = {};
    map.forEach((value, key) => {
      obj[key] = value
    });
    return obj;
  }
}
