import { VElement } from './element';
import { ElementRef, TextRef, Renderer, NodeRef } from './renderer';

/**
 * 将文本中的空白字符转成 unicode，用于在 DOM Text 节点中显示
 * @param s
 */
export function replaceEmpty(s: string) {
  return s.replace(/\s\s+/g, str => {
    return ' ' + Array.from({
      length: str.length - 1
    }).fill('\u00a0').join('');
  }).replace(/^\s|\s$/g, '\u00a0');
}

/**
 * DOM 元素节点引用的实现类
 */
export class DOMElement implements ElementRef {
  get name() {
    return this.nativeElement.nodeName.toLowerCase();
  }

  get parent() {
    return new DOMElement(this.nativeElement.parentNode as HTMLElement);
  }

  constructor(public nativeElement: HTMLElement) {
  }

  insert(newChild: NodeRef, index: number): void {
    const nextSibling = this.nativeElement.childNodes[index];
    if (nextSibling) {
      if (nextSibling !== newChild.nativeElement) {
        this.nativeElement.insertBefore(newChild.nativeElement, nextSibling);
      }
    } else if (newChild.nativeElement.parentNode !== this.nativeElement) {
      if (this.nativeElement.firstChild) {
        this.nativeElement.appendChild(newChild.nativeElement);
      } else {
        this.nativeElement.insertBefore(newChild.nativeElement, this.nativeElement.firstChild);
      }
    }
  }

  append(newChild: NodeRef): void {
    this.nativeElement.appendChild(newChild.nativeElement);
  }

  destroy(): void {
    if (this.nativeElement.parentNode) {
      this.nativeElement.parentNode.removeChild(this.nativeElement);
    }
    this.nativeElement = null;
  }
}

/**
 * DOM 文本节点引用的实现类
 */
export class DOMText implements TextRef {
  set textContent(v: string) {
    this.nativeElement.textContent = replaceEmpty(v);
  }

  get textContent() {
    return this.nativeElement.textContent;
  }

  get parent() {
    return new DOMElement(this.nativeElement.parentNode as HTMLElement);
  }

  constructor(public nativeElement: Text) {
  }

  destroy(): void {
    if (this.nativeElement.parentNode) {
      this.nativeElement.parentNode.removeChild(this.nativeElement);
    }
    this.nativeElement = null;
  }
}

/**
 * DOM 渲染器的实现类
 */
export class DomRenderer implements Renderer {
  createElement(element: VElement): ElementRef {
    const el = document.createElement(element.tagName);
    element.styles.forEach((value, key) => {
      el.style[key] = value;
    });
    element.attrs.forEach((value, key) => {
      el.setAttribute(key, value + '');
    });
    return new DOMElement(el);
  }

  createTextNode(text: string): TextRef {
    const str = replaceEmpty(text);
    return new DOMText(document.createTextNode(str));
  }
}
