import { Subject, merge, fromEvent, Observable } from 'rxjs';
import { debounceTime, filter, sampleTime, tap } from 'rxjs/operators';

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
  private historySequence: Array<{ node: HTMLElement, innerHTML: string }> = [];
  private historyIndex = 0;

  constructor(private historyStackSize = 50) {
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
      (<any>self).contentDocument = self.elementRef.contentDocument;
      (<any>self).contentWindow = self.elementRef.contentWindow;
      self.setup(self.elementRef.contentDocument);
      this.loadEvent.next(this);
    }
  }

  back() {
    if (this.historyIndex > 0 && this.historySequence.length) {
      this.historyIndex--;
      this.historyIndex = Math.max(0, this.historyIndex);
      this.apply();
    }
  }

  forward() {
    if (this.historyIndex <= this.historySequence.length - 2) {
      this.historyIndex++;
      this.apply();
    }
  }

  recordSnapshot() {
    if (this.historySequence.length !== this.historyIndex) {
      this.historySequence.length = this.historyIndex + 1;
    }
    this.historySequence.push({
      node: this.contentDocument.body.cloneNode() as HTMLElement,
      innerHTML: this.contentDocument.body.innerHTML
    });
    if (this.historySequence.length > this.historyStackSize) {
      this.historySequence.shift();
    }
    this.historyIndex = this.historySequence.length - 1;
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

  private apply() {
    const snapshot = this.historySequence[this.historyIndex];
    if (snapshot) {
      Array.from(snapshot.node.attributes).forEach(attr => {
        this.contentDocument.body.setAttribute(attr.name, attr.value);
      });
      this.contentDocument.body.innerHTML = snapshot.innerHTML;
    }
  }

  private setup(childDocument: Document) {
    const childBody = childDocument.body;
    this.autoRecordHistory(childBody);

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
    ].map(type => fromEvent(childBody, type))).pipe(debounceTime(100)).subscribe(() => {
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
    childDocument.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.ctrlKey && ev.code === 'KeyZ') {
        ev.shiftKey ? this.forward() : this.back();
        ev.preventDefault();
        return false;
      }
    });
  }

  private autoRecordHistory(body: HTMLElement) {
    this.recordSnapshot();

    let changeCount = 0;

    const obs = merge(
      fromEvent(body, 'keydown').pipe(tap(() => {
        changeCount++;
      }), sampleTime(5000)),
      ...[
        'paste',
        'cut'
      ].map(type => fromEvent(body, type)));


    let sub = obs.subscribe(() => {
      changeCount = 0;
      this.recordSnapshot();
    });

    fromEvent(body, 'blur').subscribe(() => {
      if (changeCount) {
        this.recordSnapshot();
        changeCount = 0;
        sub.unsubscribe();
        sub = obs.subscribe(() => {
          changeCount = 0;
          this.recordSnapshot();
        });
      }
    });
  }
}
