import { Observable, Subject } from 'rxjs';

import { template } from './template-html';

export class Viewer {
  onReady: Observable<Document>;

  elementRef = document.createElement('div');
  contentWindow: Window;
  contentDocument: Document;

  private frame = document.createElement('iframe');

  private readyEvent = new Subject<Document>();

  constructor(private styleSheets: string[] = []) {
    this.onReady = this.readyEvent.asObservable();

    this.frame.onload = () => {
      const doc = this.frame.contentDocument;
      this.contentDocument = doc;
      this.contentWindow = this.frame.contentWindow;
      (styleSheets).forEach(s => {
        const style = doc.createElement('style');
        style.innerHTML = s;
        doc.head.appendChild(style);
      });
      this.readyEvent.next(doc);
    };

    this.frame.setAttribute('scrolling', 'no');
    this.frame.src = `javascript:void((function () {
                      document.open();
                      document.write('${template}');
                      document.close();
                    })())`;


    this.elementRef.classList.add('tbus-wrap');
    this.frame.classList.add('tbus-frame');

    this.elementRef.appendChild(this.frame);
  }

  setViewWidth(width: string) {
    this.elementRef.style.width = width;
  }

  updateFrameHeight() {
    const childBody = this.contentDocument.body;
    const lastChild = childBody.lastChild;
    let height = 0;
    if (lastChild) {
      if (lastChild.nodeType === 1) {
        height = (lastChild as HTMLElement).getBoundingClientRect().bottom;
      } else {
        const div = this.contentDocument.createElement('div');
        childBody.appendChild(div);
        height = div.getBoundingClientRect().bottom;
        childBody.removeChild(div);
      }
    }
    this.frame.style.height = height + 30 + 'px';
  }
}
