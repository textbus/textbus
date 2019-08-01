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
    const contents = range.cloneContents();
    range.surroundContents(document.createElement(tag));
    console.log(range.commonAncestorContainer);
    // range.insertNode(contents);
    // const node = selection.focusNode as HTMLElement;
    // if (!node) {
    //   return;
    // }
    //
    // function findSelf(node: Element, tag: string) {
    //   while (node) {
    //     if (node.nodeType === 1 && node.tagName.toLowerCase() === tag) {
    //       return node;
    //     }
    //     node = node.parentNode as HTMLElement;
    //   }
    //   return null
    // }
    //
    // function cleanSelf(el: Element) {
    //   const c = document.createComment('');
    //   const parentNode = el.parentNode;
    //   parentNode.insertBefore(c, el);
    //   parentNode.removeChild(el);
    //   const childNodes = el.childNodes;
    //   const newEle = document.createDocumentFragment();
    //   Array.from(childNodes).forEach(item => newEle.appendChild(item));
    //
    //   parentNode.insertBefore(newEle, c);
    //   parentNode.removeChild(c);
    // }
    //
    // function wrapSelf(node: Node, tag: string) {
    //   if (node.nodeType === 3) {
    //     const newEle = document.createElement(tag);
    //     range.deleteContents();
    //     newEle.appendChild(contents);
    //     range.insertNode(newEle);
    //     // node.parentNode.appendChild(newEle);
    //     // newEle.appendChild(node);
    //   } else if (node.nodeType === 1) {
    //     Array.from(node.childNodes).forEach(child => {
    //       wrapSelf(child, tag);
    //     });
    //   }
    // }
    //
    // const shadowSelf = findSelf(node, tag);
    // if (shadowSelf) {
    //   cleanSelf(shadowSelf);
    // } else {
    //   if (node.nodeType === 1) {
    //     Array.from(node.querySelectorAll(tag)).forEach(item => cleanSelf(item));
    //     wrapSelf(node, tag);
    //   } else if (node.nodeType === 3) {
    //     wrapSelf(node, tag);
    //   }
    // }
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
