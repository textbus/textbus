import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { MatchDelta } from '../../matcher';
import { EditFrame } from '../edit-frame';
import { findBlockContainer, matchContainerByTagName, takeOffWrapper } from '../utils';
import { dtd } from '../dtd';

export class ListFormatter implements Formatter {
  readonly recordHistory = true;
  readonly document: Document;

  constructor(private tagName: string) {
  }

  format(range: TBRange, frame: EditFrame, matchDelta: MatchDelta): void {
    range.mark();
    if (matchDelta.overlap) {
      if (matchDelta.inSingleContainer) {
        const container = matchContainerByTagName(
          matchDelta.scopeContainer,
          this.tagName,
          frame.contentDocument.body) as HTMLElement;
        this.unList(range.rawRange, container);
      } else {
        this.findContainer(range.commonAncestorContainer as Element).forEach(item => {
          this.unList(range.rawRange, item);
        });
      }
    } else {
      const wrap = document.createElement(this.tagName);
      let li = document.createElement('li');

      const selectedNodes = Array.from((findBlockContainer(
        range.commonAncestorContainer,
        frame.contentDocument.body) as HTMLElement).childNodes)
        .filter(node => range.rawRange.intersectsNode(node));
      const position = selectedNodes[0];
      position.parentNode.insertBefore(wrap, position);
      selectedNodes.forEach(node => {
        li.appendChild(node);
        if (node.nodeType === 1 && !/inline/.test(dtd[(node as HTMLElement).tagName.toLowerCase()].display)) {
          wrap.appendChild(li);
          li = document.createElement('li');
        }
      });
      if (li.childNodes.length) {
        wrap.appendChild(li);
      }
    }

    range.removeMarksAndRestoreRange();
  }

  private findContainer(scope: Element): Element[] {
    const result: Element[] = [];
    Array.from(scope.children).forEach(node => {
      if (node.tagName.toLowerCase() === this.tagName) {
        result.push(node);
      } else {
        result.push(...this.findContainer(node));
      }
    });
    return result;
  }

  private unList(range: Range, container: Element) {
    const list = Array.from(container.children);
    const before: Element[] = [];
    const after: Element[] = [];

    while (list[0] && !range.intersectsNode(list[0])) {
      before.push(list.shift());
    }

    while (list[list.length - 1] && !range.intersectsNode(list[list.length - 1])) {
      after.unshift(list.pop());
    }

    const fragment = document.createDocumentFragment();

    list.map(li => {
      const elements: HTMLParagraphElement[] = [];
      let paragraph: HTMLParagraphElement = document.createElement('p');

      const nodes = Array.from(li.childNodes);

      while (nodes.length) {
        const node = nodes.shift();
        if (node.nodeType !== 1) {
          paragraph.appendChild(node);
        } else {
          const tagName = (node as HTMLElement).tagName.toLowerCase();
          if (/inline/.test(dtd[tagName].display)) {
            paragraph.appendChild(node);
          } else {
            elements.push(paragraph);
            paragraph = document.createElement('p');
            if (tagName !== 'p') {
              Array.from(node.childNodes).forEach(n => paragraph.appendChild(n));
              elements.push(paragraph);
              paragraph = document.createElement('p');
            } else {
              elements.push(node as HTMLParagraphElement);
            }
          }
        }
      }
      if (paragraph.childNodes.length) {
        elements.push(paragraph);
      }
      li.parentNode.removeChild(li);
      return elements;
    }).reduce((a, b) => {
      return a.concat(b);
    }, []).filter(p => {
      return p.innerText && !/^\s+$/.test(p.innerText);
    }).forEach(p => fragment.appendChild(p));

    const nextSibling = container.nextSibling;

    if (nextSibling) {
      container.parentNode.insertBefore(fragment, nextSibling);
    } else {
      container.parentNode.appendChild(fragment);
    }

    if (after.length) {
      const newList = container.cloneNode();
      after.forEach(li => newList.appendChild(li));
      if (nextSibling) {
        container.parentNode.insertBefore(newList, nextSibling);
      } else {
        container.parentNode.appendChild(newList);
      }
    }
    if (before.length === 0) {
      takeOffWrapper(container);
    }
  }
}
