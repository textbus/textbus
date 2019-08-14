import { Subject, merge, fromEvent, Observable } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';

import { template } from './template-html';

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
    merge(...[
      'keyup',
      'paste',
      'cut',
      'focus'
    ].map(type => fromEvent(childBody, type))).subscribe(() => {
      if (!childBody.innerHTML) {
        childBody.innerHTML = '<p><br></p>';
      }
    });
  }
}
