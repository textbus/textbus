import { Subject, merge, fromEvent, Observable } from 'rxjs';
import { debounceTime, filter, throttleTime } from 'rxjs/operators';

import { template } from './template-html';

export class EditFrame {
  readonly elementRef = document.createElement('iframe');
  readonly onSelectionChange: Observable<void>;
  readonly onLoad: Observable<this>;
  readonly contentDocument: Document;
  readonly contentWindow: Window;
  private selectionChangeEvent = new Subject<void>();
  private loadEvent = new Subject<this>();
  private editorHTML = template;

  constructor(private historyStackSize = 20) {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.onLoad = this.loadEvent.asObservable();
    this.elementRef.classList.add('tanbo-editor');

    this.elementRef.src = `javascript:void((function () {
                      document.open();
                      document.domain = '${document.domain}';
                      document.write('${this.editorHTML}');
                      document.close();
                    })())`;
    const self = this;
    this.elementRef.onload = () => {
      self.setup(self.elementRef.contentDocument);
      (<any>self).contentDocument = self.elementRef.contentDocument;
      (<any>self).contentWindow = self.elementRef.contentWindow;
      this.loadEvent.next(this);
    }
  }

  back() {

  }

  forward() {

  }

  push() {

  }

  /**
   * 在文档选中某一个元素节点
   * @param node
   */
  updateSelectionByElement(node: Element) {
    const selection = this.contentDocument.getSelection();
    selection.removeAllRanges();
    const range = this.contentDocument.createRange();
    range.selectNodeContents(node);
    selection.addRange(range);
    this.selectionChangeEvent.next();
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
      'selectstart',
      'focus'
    ].map(type => fromEvent(childBody, type))).pipe(debounceTime(100), throttleTime(100)).subscribe(() => {
      this.selectionChangeEvent.next();
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
    fromEvent(childBody, 'click').pipe(filter((ev: any) => {
      return /video|audio|img/i.test(ev.target.tagName);
    })).subscribe(ev => {
      const selection = this.contentDocument.getSelection();
      const range = this.contentDocument.createRange();
      range.selectNode(ev.target);
      selection.removeAllRanges();
      selection.addRange(range);
      this.selectionChangeEvent.next();
    });
  }
}
