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
      this.selectionChangeEvent.next(this.contentWindow.getSelection());
      this.loadEvent.next(this);
    }
  }

  wrap(tag: string) {
    tag = tag.toLowerCase();
    if (dtd[tag].type === 'single') {
      return;
    }
    if (dtd[tag].display === 'inline') {
      this.wrapInlineElement(tag);
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

  private wrapInlineElement(tag: string) {
    const selection = this.contentDocument.getSelection();
    const range = selection.getRangeAt(0);

    if (range.commonAncestorContainer.nodeType === 1 &&
      (range.commonAncestorContainer as HTMLElement).tagName.toLowerCase() === tag) {
      this.takeOffWrapper(range.commonAncestorContainer as HTMLElement);
      return;
    }

    const parentTagContainer = this.matchContainerByTagName(range.commonAncestorContainer as HTMLElement, tag);
    if (parentTagContainer) {
      this.reverse(parentTagContainer, range, this.contentDocument, tag);
      this.takeOffWrapper(parentTagContainer);
    } else {
      if (range.commonAncestorContainer.nodeType === 3) {
        const newWrap = document.createElement(tag);
        const isCollapsed = range.collapsed;
        range.surroundContents(newWrap);
        if (isCollapsed) {
          newWrap.innerHTML = ' ';
          range.selectNodeContents(newWrap);
        }
      } else if (range.commonAncestorContainer.nodeType === 1) {
        if (this.hasOtherTag(range.cloneContents(), tag)) {
          this.wrapper(range, this.contentDocument, tag);
        } else {
          const startWrap = this.matchContainerByTagName(range.startContainer as HTMLElement, tag);
          const endWrap = this.matchContainerByTagName(range.endContainer as HTMLElement, tag);
          Array.from((range.commonAncestorContainer as HTMLElement).getElementsByTagName(tag))
            .filter(item => item !== startWrap && item !== endWrap && range.intersectsNode(item))
            .forEach(node => {
              this.takeOffWrapper(node);
            });
          const startRange = this.contentDocument.createRange();
          startRange.setStart(range.startContainer, range.startOffset);
          startRange.setEndAfter(startWrap);
          const extractStart = startRange.extractContents().children[0];
          startWrap.parentNode.insertBefore(extractStart, startWrap.nextSibling);
          this.takeOffWrapper(extractStart);
          startRange.detach();

          const endRange = this.contentDocument.createRange();
          endRange.setStartBefore(endWrap);
          endRange.setEnd(range.endContainer, range.endOffset);
          const extractEnd = endRange.extractContents().children[0];
          endWrap.parentNode.insertBefore(extractEnd, endWrap);
          this.takeOffWrapper(extractEnd);
          endRange.detach();
        }
      }
    }
    this.contentDocument.body.focus();
  }

  private wrapper(range: Range, doc: Document, tag: string) {
    if (range.startContainer === range.endContainer && range.commonAncestorContainer.nodeType === 3) {
      range.surroundContents(document.createElement(tag));
    } else {
      this.getTextNodes(range.commonAncestorContainer as HTMLElement, tag)
        .filter(item => range.intersectsNode(item))
        .forEach(item => {
          if (item.textContent === '') {
            item.parentNode.removeChild(item);
            return;
          }
          const temporaryRange = doc.createRange();
          temporaryRange.selectNode(item);
          if (item === range.startContainer) {
            temporaryRange.setStart(item, range.startOffset);
          } else if (item === range.endContainer) {
            temporaryRange.setEnd(item, range.endOffset);
          }
          temporaryRange.surroundContents(document.createElement(tag));
          temporaryRange.detach();
        });
    }
  }

  private reverse(container: HTMLElement, range: Range, doc: Document, tag: string) {
    Array.from(container.childNodes).forEach(node => {
      if (range.intersectsNode(node)) {
        if (node.nodeType === 1) {
          if ((node as HTMLElement).tagName.toLowerCase() === tag) {
            this.takeOffWrapper(node as HTMLElement);
          } else {
            this.reverse(node as HTMLElement, range, doc, tag);
          }
        } else if (node.nodeType === 3) {
          if (node === range.startContainer && range.startOffset > 0) {
            const startRange = doc.createRange();
            startRange.setStartBefore(node);
            startRange.setEnd(node, range.startOffset);
            startRange.surroundContents(document.createElement(tag));
            startRange.detach();
          }
          if (node === range.endContainer) {
            const endRange = doc.createRange();
            endRange.setStart(node, range.endOffset);
            endRange.setEndAfter(node);
            if (!endRange.collapsed) {
              endRange.surroundContents(document.createElement(tag));
            }
            endRange.detach();
          }
        }
      } else {
        if (node.nodeType === 1) {
          this.reverse(node as HTMLElement, range, doc, tag);
        } else if (node.nodeType === 3) {
          const containerRange = doc.createRange();
          containerRange.selectNode(node);
          containerRange.surroundContents(document.createElement(tag));
          containerRange.detach();
        }
      }
    });
  }

  private getTextNodes(container: HTMLElement, exclude: string) {
    const result: Node[] = [];
    Array.from(container.childNodes).forEach(node => {
      if (node.nodeType === 3) {
        result.push(node);
      } else if (node.nodeType === 1 && (node as HTMLElement).tagName.toLowerCase() !== exclude) {
        result.push(...this.getTextNodes(node as HTMLElement, exclude));
      }
    });
    return result;
  }

  private hasOtherTag(ele: Node, tag: string): boolean {
    for (const node of Array.from(ele.childNodes)) {
      if (node.nodeType === 3 && node.textContent !== '') {
        return true;
      }
      if (node.nodeType === 1) {
        if ((node as HTMLElement).tagName.toLowerCase() !== tag) {
          return this.hasOtherTag(node, tag);
        }
      }
    }
    return false;
  }

  private matchContainerByTagName(node: HTMLElement, tagName: string) {
    while (node) {
      if (node.nodeType === 1 && node.tagName.toLowerCase() === tagName) {
        return node;
      }
      node = node.parentNode as HTMLElement;
    }
    return null;
  }

  private takeOffWrapper(el: Element) {
    const c = document.createComment('');
    const parentNode = el.parentNode;
    parentNode.insertBefore(c, el);
    parentNode.removeChild(el);
    const childNodes = el.childNodes;
    const newEle = document.createDocumentFragment();
    Array.from(childNodes).forEach(item => newEle.appendChild(item));

    parentNode.insertBefore(newEle, c);
    parentNode.removeChild(c);
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
