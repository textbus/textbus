import { Observable, Subject } from 'rxjs';

import { iframeHTML } from './iframe-html';
import { Input } from './input';

export class Viewer {
  onReady: Observable<Document>;
  contentWindow: Window;
  contentDocument: Document;
  input: Input;
  elementRef = document.createElement('iframe');

  private readyEvent = new Subject<Document>();
  private id: number = null;
  private minHeight = 400;

  constructor(private styleSheets: string[] = []) {
    this.onReady = this.readyEvent.asObservable();

    this.elementRef.onload = () => {
      const doc = this.elementRef.contentDocument;
      this.contentDocument = doc;
      this.contentWindow = this.elementRef.contentWindow;
      (styleSheets).forEach(s => {
        const style = doc.createElement('style');
        style.innerHTML = s;
        doc.head.appendChild(style);
      });
      this.input = new Input(doc);
      this.readyEvent.next(doc);
      this.listen();
    };

    this.elementRef.setAttribute('scrolling', 'no');
    this.elementRef.src = `javascript:void((function () {
                      document.open();
                      document.write('${iframeHTML}');
                      document.close();
                    })())`;


    this.elementRef.classList.add('tbus-frame');
  }

  setMinHeight(height: number) {
    this.minHeight = height;
  }

  destroy() {
    cancelAnimationFrame(this.id);
  }

  private listen() {
    const childBody = this.contentDocument.body;
    const fn = () => {
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
