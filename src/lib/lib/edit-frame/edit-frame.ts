import { Subject, merge, fromEvent, Observable } from 'rxjs';
import { debounceTime, filter, sampleTime, tap } from 'rxjs/operators';

import { template } from './template-html';
import { findElementByTagName } from './utils';

export class EditFrame {
  readonly elementRef = document.createElement('iframe');
  readonly onSelectionChange: Observable<void>;
  readonly onReady: Observable<this>;
  readonly contentChange: Observable<string>;
  readonly contentDocument: Document;
  readonly contentWindow: Window;

  get canBack() {
    return this.historySequence.length > 0 && this.historyIndex > 0;
  }

  get canForward() {
    return this.historySequence.length > 0 && this.historyIndex < this.historySequence.length - 1;
  }

  private selectionChangeEvent = new Subject<void>();
  private contentChangeEvent = new Subject<string>();
  private readyEvent = new Subject<this>();
  private editorHTML = template;
  private historySequence: Array<{ node: HTMLElement, innerHTML: string }> = [];
  private historyIndex = 0;

  private canPublishChangeEvent = false;

  constructor(private historyStackSize = 50, private defaultContents = '<p><br></p>') {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.contentChange = this.contentChangeEvent.asObservable();
    this.onReady = this.readyEvent.asObservable();
    this.elementRef.classList.add('tanbo-editor');

    this.elementRef.onload = () => {
      (<any>this).contentDocument = this.elementRef.contentDocument;
      (<any>this).contentWindow = this.elementRef.contentWindow;
      (<any>this).contentDocument.body.contentEditable = true;
      (<any>this).contentDocument.body.innerHTML = defaultContents;
      this.setup(this.elementRef.contentDocument);
      this.writeContents(defaultContents).then(() => {
        this.autoRecordHistory(this.elementRef.contentDocument.body);
        this.readyEvent.next(this);
      });
    };
    this.elementRef.src = `javascript:void((function () {
                      document.open();
                      document.domain = '${document.domain}';
                      document.write('${this.editorHTML}');
                      document.close();
                    })())`;


  }

  back() {
    if (this.canBack) {
      this.historyIndex--;
      this.historyIndex = Math.max(0, this.historyIndex);
      this.apply();
    }
  }

  forward() {
    if (this.canForward) {
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

  updateContents(html: string) {
    this.writeContents(html).then(() => {
      this.recordSnapshot();
      this.dispatchContentChangeEvent();
    });
  }

  private writeContents(html: string): Promise<void> {
    return new Promise<void>(resolve => {
      const temporaryIframe = document.createElement('iframe');
      temporaryIframe.onload = () => {
        this.contentDocument.body.innerHTML = temporaryIframe.contentDocument.body.innerHTML;
        document.body.removeChild(temporaryIframe);
        resolve();
      };
      temporaryIframe.style.cssText =
        'position: absolute;' +
        'left: -9999px;' +
        'top: -9999px;' +
        'width:0;' +
        'height:0;' +
        'opacity:0';
      temporaryIframe.src = `javascript:void((function () {
                      document.open();
                      document.domain = '${document.domain}';
                      document.write('${html}');
                      document.close();
                    })())`;

      document.body.appendChild(temporaryIframe);
    });
  }

  private dispatchContentChangeEvent() {
    if (!this.canPublishChangeEvent) {
      return;
    }
    const head = this.contentDocument.head;
    const body = this.contentDocument.body.cloneNode(true) as HTMLElement;

    body.removeAttribute('contentEditable');

    this.contentChangeEvent.next(`
<!DOCTYPE html>
<html lang="zh">
${head.outerHTML}
${body.outerHTML}
</html>
`);
  }

  private apply() {
    const snapshot = this.historySequence[this.historyIndex];
    if (snapshot) {
      Array.from(snapshot.node.attributes).forEach(attr => {
        this.contentDocument.body.setAttribute(attr.name, attr.value);
      });
      this.contentDocument.body.innerHTML = snapshot.innerHTML;
      this.dispatchContentChangeEvent();
    }
  }

  private setup(childDocument: Document) {
    const childBody = childDocument.body;

    // 如果选区是表格，需要对此作处理
    let insertMask = false;
    let mask = childDocument.createElement('div');
    mask.style.cssText = 'position: fixed; background: rgba(0,0,0,.1); pointer-events: none;';

    let insertStyle = false;
    let style = childDocument.createElement('style');
    style.innerText = '::selection { background: transparent; }';

    fromEvent(childBody, 'mousedown').subscribe(startEvent => {
      if (insertStyle) {
        childDocument.getSelection().removeAllRanges();
        childDocument.head.removeChild(style);
        insertStyle = false;
      }
      if (insertMask) {
        childBody.removeChild(mask);
        insertMask = false;
      }
      const startTd = findElementByTagName(Array.from(startEvent.composedPath()) as Array<Node>, 'td');
      let targetTd: HTMLElement;
      if (!startTd) {
        return;
      }

      const unBindMouseover = fromEvent(childBody, 'mouseover').subscribe(mouseoverEvent => {
        targetTd = findElementByTagName(Array.from(mouseoverEvent.composedPath()) as Array<Node>, 'td') || targetTd;
        if (targetTd) {
          if (targetTd !== startTd) {
            childDocument.head.appendChild(style);
            insertStyle = true;
          }
          if (!insertMask) {
            childBody.appendChild(mask);
            insertMask = true;
          }
          const startPosition = startTd.getBoundingClientRect();
          const targetPosition = targetTd.getBoundingClientRect();

          const left = Math.min(startPosition.left, targetPosition.left);
          const top = Math.min(startPosition.top, targetPosition.top);
          const width = Math.max(startPosition.right, targetPosition.right) - left;
          const height = Math.max(startPosition.bottom, targetPosition.bottom) - top;

          mask.style.left = left + 'px';
          mask.style.top = top + 'px';
          mask.style.width = width + 'px';
          mask.style.height = height + 'px';
        }
      });

      const unBindMouseup = merge(...[
        'mouseleave',
        'mouseup'
      ].map(type => fromEvent(childBody, type))).subscribe(() => {
        unBindMouseover.unsubscribe();
        unBindMouseup.unsubscribe();
      });
    });


    // 兼听可能引起选区变化的事件，并发出通知
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
    // 兼听可能引起编辑区空白的事件，并重新设置默认值
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
    // 当点击视频、音频、图片时，自动选中该标签
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
    // 禁用默认的历史记录回退及前进功能
    childDocument.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.ctrlKey && ev.code === 'KeyZ') {
        ev.shiftKey ? this.forward() : this.back();
        ev.preventDefault();
        return false;
      }
    });
  }

  private autoRecordHistory(body: HTMLElement) {
    this.canPublishChangeEvent = true;
    let changeCount = 0;
    this.recordSnapshot();
    const obs = merge(
      fromEvent(body, 'keydown').pipe(tap(() => {
        changeCount++;
      }), sampleTime(5000)),
      ...[
        'paste',
        'cut'
      ].map(type => fromEvent(body, type)));

    const subscribe = () => {
      return obs.subscribe(() => {
        changeCount = 0;
        this.recordSnapshot();
        this.dispatchContentChangeEvent();
      });
    };

    let sub = subscribe();

    fromEvent(body, 'blur').subscribe(() => {
      if (changeCount) {
        this.recordSnapshot();
        this.dispatchContentChangeEvent();
        changeCount = 0;
        sub.unsubscribe();
        sub = subscribe();
      }
    });
  }
}
