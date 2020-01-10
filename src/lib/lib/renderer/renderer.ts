import { VElement } from './element';
import { ElementRef, TextRef, Renderer } from './help';
import { DOMElement, DOMText, replaceEmpty } from './dom-element';

export class DefaultRenderer extends Renderer {
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
