import { VElement } from './element';

export interface NativeElement {
  firstChild: NativeNode;
  parentNode: NativeElement;
  nextSibling: NativeNode;
  previousSibling: NativeNode;
  nodeName: string;
  style?: any;
  childNodes?: any;

  insertBefore(newChild: NativeNode, refChild: NativeNode): NativeNode;

  appendChild(newChild: NativeNode): NativeNode;

  removeChild(oldChild: NativeNode): NativeNode;

  getAttribute?(key: string): string;
}

export interface NativeText {
  textContent: string;
  parentNode: NativeElement;
  nextSibling: NativeNode;
  previousSibling: NativeNode;
}

export type NativeNode = NativeText | NativeElement;

export abstract class Renderer {
  abstract createElement(element: VElement): NativeElement;

  abstract createTextNode(text: string): NativeText;
}

export class DefaultRenderer extends Renderer {
  createElement(element: VElement): HTMLElement {
    const el = document.createElement(element.tagName);
    element.styles.forEach((value, key) => {
      el.style[key] = value;
    });
    element.attrs.forEach((value, key) => {
      el.setAttribute(key, value + '');
    });
    return el;
  }

  createTextNode(text: string): Text {
    const str = text.replace(/\s\s+/g, str => {
      return ' ' + Array.from({
        length: str.length - 1
      }).fill('\u00a0').join('');
    }).replace(/^\s|\s$/g, '\u00a0');
    return document.createTextNode(str);
  }
}
