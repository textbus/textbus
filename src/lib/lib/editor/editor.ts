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
    const self = this;

    function wrapper(range: Range, selection: Selection, doc: Document, tag: string) {
      const startWrapper = self.findParentByTagName(range.startContainer as HTMLElement, tag);
      const endWrapper = self.findParentByTagName(range.endContainer as HTMLElement, tag);
      if (startWrapper) {
        range.setStartAfter(startWrapper);
      }
      if (endWrapper) {
        range.setEndBefore(endWrapper);
      }
      if (range.startContainer === range.endContainer && range.commonAncestorContainer.nodeType === 3) {
        range.surroundContents(document.createElement(tag));
      } else {
        self.getTextNodes(range.commonAncestorContainer as HTMLElement, tag)
          .filter(item => selection.containsNode(item))
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

    function reverse(container: HTMLElement, range: Range, doc: Document, tag: string) {
      Array.from(container.childNodes).forEach(node => {
        if (!selection.containsNode(node) && node !== range.startContainer && node !== range.endContainer) {
          if (node.nodeType === 1) {
            reverse(node as HTMLElement, range, doc, tag);
          } else if (node.nodeType === 3) {
            const range = doc.createRange();
            range.selectNode(node);
            range.surroundContents(document.createElement(tag));
          }
          return;
        }
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

      });
    }

    const selection = this.contentDocument.getSelection();
    const range = selection.getRangeAt(0);

    const shadowSelf = this.findParentByTagName(range.commonAncestorContainer as HTMLElement, tag) as HTMLElement;
    if (shadowSelf) {
      reverse(shadowSelf, range, this.contentDocument, tag);
      this.takeOffWrapper(shadowSelf);
    } else {
      if (range.commonAncestorContainer.nodeType === 3) {
        range.surroundContents(document.createElement(tag));
      } else if (range.commonAncestorContainer.nodeType === 1) {
        if (this.hasOtherTag(range.cloneContents(), tag)) {
          wrapper(range, selection, this.contentDocument, tag);
        } else {
          // 这里没好
          // reverse(range.commonAncestorContainer as HTMLElement, range, this.contentDocument, tag);
          // Array.from((range.commonAncestorContainer as HTMLElement).getElementsByTagName(tag)).forEach(item => {
          //   this.takeOffWrapper(item);
          // });
        }
      }
    }
    this.contentDocument.body.focus();
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

  private findParentByTagName(node: Element, tagName: string) {
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
