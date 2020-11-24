import { Observable, Subject } from 'rxjs';

import { iframeHTML } from './iframe-html';
import { Input } from './input';

export class Viewer {
  onReady: Observable<Document>;

  get contentWindow() {
    return this.elementRef.contentWindow;
  }

  get contentDocument() {
    return this.elementRef.contentDocument;
  };

  input: Input;
  elementRef = document.createElement('iframe');

  set sourceCodeMode(b: boolean) {
    this._sourceCodeMode = b;
    if (this.contentDocument) {
      if (b) {
        this.contentDocument.head.append(this.sourceCodeModeStyleSheet)
      } else {
        this.sourceCodeModeStyleSheet.parentNode?.removeChild(this.sourceCodeModeStyleSheet);
      }
    }
  }

  private _sourceCodeMode = false;
  private sourceCodeModeStyleSheet = document.createElement('style');
  private readyEvent = new Subject<Document>();
  private id: number = null;
  private minHeight = 400;

  constructor(private styleSheets: string[] = []) {
    this.onReady = this.readyEvent.asObservable();
    this.sourceCodeModeStyleSheet.innerHTML = `body{padding:0}body>pre{border-radius:0;border:none;margin:0;height:100%;background:none}`;

    this.elementRef.setAttribute('scrolling', 'no');
    const styleEl = document.createElement('style');
    styleEl.innerHTML = styleSheets.join('');

    const html = iframeHTML.replace(/(?=<\/head>)/, styleEl.outerHTML);
    this.elementRef.src = `javascript:void(
      (function () {
        document.open();
        document.domain='${document.domain}';
        document.write('${html}');
        document.close();
        window.parent.postMessage('complete','${location.origin}');
      })()
      )`;

    this.elementRef.onload = () => {
      this.elementRef.onload = null; // 低版本 chrome 会触发两次 load
      const doc = this.elementRef.contentDocument;
      this.sourceCodeMode = this._sourceCodeMode;
      this.input = new Input(doc);
      // this.readyEvent.next(doc);
      // this.listen();
    };
    const onMessage = (ev: MessageEvent) => {
      if (ev.data === 'complete') {
        window.removeEventListener('message', onMessage);
        const doc = this.elementRef.contentDocument;
        this.readyEvent.next(doc);
        this.listen();
      }
    }
    window.addEventListener('message', onMessage);
    this.elementRef.classList.add('textbus-frame');
  }

  setMinHeight(height: number) {
    this.minHeight = height;
  }

  destroy() {
    cancelAnimationFrame(this.id);
  }

  private listen() {
    const fn = () => {
      const childBody = this.contentDocument.body;
      const lastChild = childBody.lastChild;
      let height = 0;
      if (lastChild) {
        if (lastChild.nodeType === Node.ELEMENT_NODE) {
          height = (lastChild as HTMLElement).getBoundingClientRect().bottom;
        } else {
          const div = this.contentDocument.createElement('div');
          childBody.appendChild(div);
          height = div.getBoundingClientRect().bottom;
          childBody.removeChild(div);
        }
      }
      this.elementRef.style.height = Math.max(height + 30, this.minHeight) + 'px';
      this.id = requestAnimationFrame(fn);
    }
    this.id = requestAnimationFrame(fn);
  }
}
