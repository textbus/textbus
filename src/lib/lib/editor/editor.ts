import { Subject, merge, fromEvent, Observable } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';

import { template } from './template-html';
import { dtd } from './dtd';

export class Editor {
  readonly host = document.createElement('iframe');
  readonly onSelectionChange: Observable<Selection>;
  readonly onLoad: Observable<this>;
  readonly contentDocument: Document;
  readonly contentWindow: Window;
  private selectionChangeEvent = new Subject<Selection>();
  private loadEvent = new Subject<this>();
  private editorHTML = template;
  private selection: Selection;

  constructor() {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.onLoad = this.loadEvent.asObservable();
    this.host.classList.add('tanbo-editor');

    this.host.src = `javascript:void((function () {
                      document.open();
                      document.domain = '${document.domain}';
                      document.write('${this.editorHTML}');
                      document.close();
                    })())`;
    const self = this;
    this.host.onload = () => {
      self.setup(self.host.contentDocument);
      (<any>self).contentDocument = self.host.contentDocument;
      (<any>self).contentWindow = self.host.contentWindow;
      this.contentDocument.body.focus();
      this.selection = this.contentDocument.getSelection();
      this.selectionChangeEvent.next(this.selection);
      this.loadEvent.next(this);
    }
  }

  format(tag: string) {
    tag = tag.toLowerCase();
    if (dtd[tag].type === 'single') {
      return;
    }
    if (dtd[tag].display === 'inline') {
      this.inlineElementFormat(tag);
    }
  }

  /**
   * 在文档选中某一个元素节点
   * @param node
   */
  updateSelectionByElement(node: Element) {
    const selection = this.contentDocument.getSelection();
    selection.removeAllRanges();
    const range = this.contentDocument.createRange();
    range.selectNode(node);
    selection.addRange(range);
  }

  private inlineElementFormat(tag: string) {
    const selection = this.selection;
    const range = selection.getRangeAt(0);

    const parentTagContainer = this.matchContainerByTagName(
      range.commonAncestorContainer as HTMLElement,
      tag,
      document.body) as HTMLElement;

    if (parentTagContainer) {
      if (range.collapsed) {
        return;
      }

      const {current, before, after, endMark, startMark} = this.splitBySelectedRange(range, parentTagContainer);

      this.wrap(before, tag);
      this.wrap(after, tag);
      this.takeOffWrapper(parentTagContainer);
      before.detach();
      after.detach();
      current.setStartAfter(startMark);
      current.setEndBefore(endMark);

      startMark.parentNode.removeChild(startMark);
      endMark.parentNode.removeChild(endMark);
    } else {
      if (range.commonAncestorContainer.nodeType === 3) {
        const newWrap = document.createElement(tag);
        const isCollapsed = range.collapsed;
        range.surroundContents(newWrap);
        if (isCollapsed) {
          newWrap.innerHTML = '&#8203;';
          range.selectNodeContents(newWrap);
        }
      } else if (range.commonAncestorContainer.nodeType === 1) {
        console.log(3)
        const {before, current, after, startMark, endMark} = this.splitBySelectedRange(range, range.commonAncestorContainer as Element);

        const textNodes = this.getTextNodes(current.commonAncestorContainer as HTMLElement, tag).filter(node => {
          return current.intersectsNode(node);
        });
        const allOffspringInTag = textNodes.length === 0;
        if (allOffspringInTag) {
          this.unWrap(current, tag);
          console.log(4)
        } else {
          console.log(5)
          current.setStartBefore(startMark);
          current.setEndAfter(endMark);
          this.unWrap(current, tag);
          current.setStartAfter(startMark);
          current.setEndBefore(endMark);
          this.wrap(current, tag);
        }
        before.detach();
        after.detach();
        const s = this.findEmptyContainer(startMark);
        const e = this.findEmptyContainer(endMark);
        current.setStartAfter(s);
        current.setEndBefore(e);
        s.parentNode.removeChild(s);
        e.parentNode.removeChild(e);
      }
    }
    this.contentDocument.body.focus();
  }

  private findEmptyContainer(node: Node): Node {
    if ((node.parentNode as HTMLElement).innerText) {
      return node;
    }
    return this.findEmptyContainer(node.parentNode);
  }

  private splitBySelectedRange(range: Range, scope: Element): {
    before: Range,
    current: Range,
    after: Range,
    startMark: HTMLElement,
    endMark: HTMLElement
  } {
    const beforeRange = this.contentDocument.createRange();
    const afterRange = this.contentDocument.createRange();

    const startMark = document.createElement('span');
    const endMark = document.createElement('span');

    if (range.startContainer.nodeType === 3) {
      const startParent = range.startContainer.parentNode;
      beforeRange.setStart(range.startContainer, 0);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      startParent.insertBefore(beforeRange.extractContents(), range.startContainer);
      startParent.insertBefore(startMark, range.startContainer);
      beforeRange.setStartBefore(scope);
      beforeRange.setEndBefore(startMark);
    } else if (range.startContainer.nodeType === 1) {
      beforeRange.setStartBefore(scope);
      range.startContainer.insertBefore(startMark, range.startContainer.childNodes[range.startOffset]);
      beforeRange.setEndBefore(startMark);
    }

    if (range.endContainer.nodeType === 3) {
      const endParent = range.endContainer.parentNode;
      afterRange.setStart(range.endContainer, range.endOffset);
      afterRange.setEndAfter(range.endContainer);
      endParent.appendChild(endMark);
      endParent.appendChild(afterRange.extractContents());
      afterRange.setStartAfter(endMark);
      afterRange.setEndAfter(scope);
    } else if (range.endContainer.nodeType === 1) {
      range.endContainer.insertBefore(endMark, range.endContainer.childNodes[range.endOffset]);
      afterRange.setStartAfter(endMark);
      afterRange.setEndAfter(scope);
    }
    return {
      before: beforeRange,
      current: range,
      after: afterRange,
      startMark,
      endMark
    };
  }

  private wrap(range: Range, tag: string) {
    this.getTextNodes(range.commonAncestorContainer as Element).filter(item => {
      if (!item.textContent) {
        item.parentNode.removeChild(item);
        return false;
      }
      return range.intersectsNode(item);
    }).forEach(item => {
      const wrap = document.createElement(tag);
      item.parentNode.replaceChild(wrap, item);
      wrap.appendChild(item);
    });
  }

  private unWrap(range: Range, tag: string) {
    const start = this.matchContainerByTagName(range.startContainer, tag, range.commonAncestorContainer);
    const end = this.matchContainerByTagName(range.endContainer, tag, range.commonAncestorContainer);

    if (start) {
      const startRange = document.createRange();
      startRange.setStartBefore(start);
      startRange.setEnd(range.startContainer, range.startOffset);
      start.parentNode.insertBefore(startRange.extractContents(), start);
    }
    if (end) {
      const endRange = document.createRange();
      endRange.setStart(range.endContainer, range.endOffset);
      endRange.setEndAfter(end);
      if (end.nextSibling) {
        end.parentNode.insertBefore(endRange.extractContents(), end.nextSibling);
      } else {
        end.parentNode.appendChild(endRange.extractContents());
      }
    }

    Array.from((range.commonAncestorContainer as HTMLElement).getElementsByTagName(tag))
      .filter(item => range.intersectsNode(item))
      .forEach(item => {
        this.takeOffWrapper(item);
      });
  }

  private normalize(el: Element) {
    const elements = Array.from(el.childNodes);
    for (let i = 0; i < elements.length; i++) {
      const node = elements[i];
      for (let j = i + 1; j < elements.length; j++) {
        const next = elements[j];
        if (next) {
          break;
        }
        if (node.nodeType === 3 && next.nodeType === 3) {
          node.textContent = node.textContent + next.textContent;
          el.removeChild(next);
          i++;
        } else if (node.nodeType === 1 && next.nodeType === 1 &&
          (node as Element).tagName === (next as Element).tagName) {
          Array.from(next.childNodes).forEach(item => node.appendChild(item));
          el.removeChild(next);
          i++;
        }
      }
      if (node.nodeType === 1) {
        this.normalize(node as HTMLElement);
      }
    }
  }

  private getTextNodes(container: Element, excludeTag?: string) {
    const result: Node[] = [];
    Array.from(container.childNodes).forEach(node => {
      if (node.nodeType === 3) {
        result.push(node);
      } else if (node.nodeType === 1) {
        if (!excludeTag) {
          result.push(...this.getTextNodes(node as HTMLElement));
        } else if ((node as HTMLElement).tagName.toLowerCase() !== excludeTag) {
          result.push(...this.getTextNodes(node as HTMLElement, excludeTag));
        }
      }
    });
    return result;
  }

  private matchContainerByTagName(node: Node, tagName: string, scope: Node) {
    while (node) {
      if (node === scope) {
        return null;
      }
      if (node.nodeType === 1 && (node as HTMLElement).tagName.toLowerCase() === tagName) {
        return node;
      }
      node = node.parentNode as HTMLElement;
    }
    return null;
  }

  private takeOffWrapper(el: Element) {
    const fragment = document.createDocumentFragment();
    Array.from(el.childNodes).forEach(item => {
      fragment.appendChild(item);
    });
    el.parentNode.replaceChild(fragment, el);
  }

  private setup(childDocument: Document) {
    const childBody = childDocument.body;
    merge(...[
      'click',
      'contextmenu',
      'mousedown',
      'keydown',
      'keyup',
      'keypress',
      'mouseup',
      'selectstart'
    ].map(type => fromEvent(childBody, type))).pipe(debounceTime(100), throttleTime(100)).subscribe(() => {
      this.selectionChangeEvent.next(this.contentWindow.getSelection());
    });
  }
}
