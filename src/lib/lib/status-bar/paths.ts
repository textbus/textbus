import { Observable, Subject } from 'rxjs';
import { createElement, createTextNode } from '../uikit/uikit';

export class Paths {
  onCheck: Observable<HTMLElement>;
  readonly elementRef = createElement('div', {
    classes: ['textbus-paths'],
    children: [createElement('div', {
      classes: ['textbus-paths-label'],
      children: [createTextNode('路径：')]
    })]
  });
  readonly pathLinks = createElement('div', {
    classes: ['textbus-paths-links']
  });
  private checkEvent = new Subject<HTMLElement>();

  constructor() {
    this.onCheck = this.checkEvent.asObservable();
    this.elementRef.appendChild(this.pathLinks);
  }

  update(node: Node) {
    const fragment = document.createDocumentFragment();
    const elements: HTMLElement[] = [];
    while (node) {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        node = node.parentNode as HTMLElement;
      } else {
        const tagName = (node as HTMLElement).tagName;
        if (tagName && tagName !== 'HTML') {
          const link = document.createElement('button');
          link.type = 'button';
          link.classList.add('textbus-paths-link');
          link.innerText = node.nodeName.toLowerCase();
          ((node) => {
            link.onclick = () => {
              this.checkEvent.next(node as HTMLElement);
            };
          })(node);
          elements.push(link);
          node = node.parentNode as HTMLElement;
        } else {
          break;
        }
      }
    }
    let ele = elements.pop();
    while (ele) {
      fragment.appendChild(ele);
      ele = elements.pop();
      if (ele) {
        const split = document.createElement('span');
        split.classList.add('textbus-paths-split', 'textbus-icon-arrow-right');
        fragment.appendChild(split);
      }
    }
    this.pathLinks.innerHTML = '';
    this.pathLinks.appendChild(fragment);
  }
}
