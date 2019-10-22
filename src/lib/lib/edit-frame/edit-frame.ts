import { Subject, merge, fromEvent, Observable } from 'rxjs';
import { auditTime, filter, map, sampleTime, tap } from 'rxjs/operators';

import { template } from './template-html';
import { Hooks } from '../help';
import { Matcher } from '../matcher';
import { TBRange } from '../range';
import { Formatter } from './fomatter/formatter';
import { Cursor } from './cursor';
import { RootElement } from './elements/root-element';

export class EditFrame {
  readonly elementRef = document.createElement('div');
  readonly onSelectionChange: Observable<Range[]>;
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

  private cursor: Cursor;
  private frame = document.createElement('iframe');
  private selectionChangeEvent = new Subject<Range[]>();
  private contentChangeEvent = new Subject<string>();
  private readyEvent = new Subject<this>();
  private editorHTML = template;
  private historySequence: Array<{ node: HTMLElement, innerHTML: string }> = [];
  private historyIndex = 0;
  private hooksList: Array<Hooks> = [];

  private canPublishChangeEvent = false;

  constructor(private historyStackSize = 50, private defaultContents = '<p><br></p>') {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.contentChange = this.contentChangeEvent.asObservable();
    this.onReady = this.readyEvent.asObservable();
    this.elementRef.classList.add('tanbo-editor-wrap');
    this.frame.classList.add('tanbo-editor-frame');
    this.elementRef.appendChild(this.frame);
    this.frame.onload = () => {
      (<any>this).contentDocument = this.frame.contentDocument;
      (<any>this).contentWindow = this.frame.contentWindow;
      // (<any>this).contentDocument.body.contentEditable = true;
      (<any>this).contentDocument.body.innerHTML = defaultContents;

      this.cursor = new Cursor(this.contentDocument);
      this.elementRef.appendChild(this.cursor.elementRef);


      this.setup(this.frame.contentDocument);
      this.writeContents(defaultContents).then((body) => {
        const root = new RootElement();
        root.setContents(body);
        this.autoRecordHistory(this.frame.contentDocument.body);
        this.readyEvent.next(this);
      });
    };
    this.frame.src = `javascript:void((function () {
                      document.open();
                      document.domain = '${document.domain}';
                      document.write('${this.editorHTML}');
                      document.close();
                    })())`;


  }

  use(hooks: Hooks) {
    this.hooksList.push(hooks);
    if (typeof hooks.setup === 'function') {
      hooks.setup(this.elementRef, {
        document: this.contentDocument,
        window: this.contentWindow
      });
    }
  }

  back() {
    if (this.canBack) {
      this.historyIndex--;
      this.historyIndex = Math.max(0, this.historyIndex);
      this.applyHistory();
    }
  }

  forward() {
    if (this.canForward) {
      this.historyIndex++;
      this.applyHistory();
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
    range.selectNodeContents(node);
    selection.addRange(range);
    this.selectionChangeEvent.next(this.getRanges());
  }

  updateContents(html: string) {
    this.writeContents(html).then(() => {
      this.recordSnapshot();
    });
  }

  getRanges(): Range[] {
    const selection = this.contentDocument.getSelection();
    const ranges = [];
    for (let i = 0; i < selection.rangeCount; i++) {
      ranges.push(selection.getRangeAt(i));
    }
    const selectionChangeHooks = this.hooksList.filter(hooks => typeof hooks.onSelectionChange === 'function');
    if (selectionChangeHooks.length && ranges.length) {
      return ranges.map(range => {
        return selectionChangeHooks.reduce((previousValue, currentValue) => {
          return previousValue.map(r => {
            if (currentValue.matcher instanceof Matcher) {
              const matchDelta = currentValue.matcher.match(this, r);
              if (matchDelta.overlap || matchDelta.contain) {
                const ranges = currentValue.onSelectionChange(r, {
                  window: this.contentWindow,
                  document: this.contentDocument
                });
                return Array.isArray(ranges) ? ranges : [ranges];
              }
              return [r];
            }
            const ranges = currentValue.onSelectionChange(r, {
              window: this.contentWindow,
              document: this.contentDocument
            });
            return Array.isArray(ranges) ? ranges : [ranges];
          }).reduce((p, v) => {
            return p.concat(v);
          });
        }, [range]);
      }).reduce((p, v) => {
        return p.concat(v);
      })
    }
    return ranges;
  }

  apply(formatter: Formatter, matcher: Matcher, hooks: Hooks = {}) {
    const ranges = this.getRanges();
    if (typeof hooks.onApply === 'function') {
      hooks.onApply(ranges, formatter, {
        document: this.contentDocument,
        window: this.contentWindow
      })
    } else {
      const matches = ranges.map(item => {
        return {
          range: new TBRange(item, this.contentDocument),
          matchDelta: matcher.match(this, item)
        }
      });
      const overlap = matches.map(item => item.matchDelta.overlap).reduce((p, n) => p && n);
      matches.forEach(item => {
        item.matchDelta.overlap = overlap;
        formatter.format(item.range, this, item.matchDelta);
      });
    }
    if (formatter.recordHistory) {
      this.recordSnapshot();
    }
    this.focus();
    if (typeof hooks.onApplied === 'function') {
      hooks.onApplied(this.elementRef, {
        window: this.contentWindow,
        document: this.contentDocument
      });
    }
  }

  focus() {
    this.contentDocument.body.focus();
  }

  private recordSnapshot() {
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
    this.dispatchContentChangeEvent();
  }

  private writeContents(html: string) {
    return new Promise<HTMLElement>(resolve => {
      const temporaryIframe = document.createElement('iframe');
      temporaryIframe.onload = () => {
        const body = temporaryIframe.contentDocument.body;
        document.body.removeChild(temporaryIframe);
        resolve(body);
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
    const head = this.contentDocument.head.cloneNode(true) as HTMLHeadElement;
    const body = this.contentDocument.body.cloneNode(true) as HTMLBodyElement;

    this.hooksList.filter(hooks => {
      return typeof hooks.onOutput === 'function';
    }).forEach(hooks => {
      hooks.onOutput(head, body);
    });

    body.removeAttribute('contentEditable');

    this.contentChangeEvent.next(`
<!DOCTYPE html>
<html lang="zh">
${head.outerHTML}
${body.outerHTML}
</html>
`);
  }

  private applyHistory() {
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

    fromEvent(childDocument, 'selectionchange').pipe(map(() => {
      if (!childBody.innerHTML) {
        childBody.innerHTML = '<p><br></p>';
      }
    })).pipe(auditTime(100)).subscribe(() => {
      if (this.contentDocument.getSelection().rangeCount) {
        this.selectionChangeEvent.next(this.getRanges());
      }
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
    this.recordSnapshot();
    this.canPublishChangeEvent = true;
    let changeCount = 0;
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
      });
    };

    let sub = subscribe();

    fromEvent(body, 'blur').subscribe(() => {
      if (changeCount) {
        this.recordSnapshot();
        changeCount = 0;
        sub.unsubscribe();
        sub = subscribe();
      }
    });
  }
}
