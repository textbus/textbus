import { fromEvent, Observable, Subject } from 'rxjs';

import { template } from './template-html';
import { TBSelection } from '../selection/selection';

export class Viewer {
  elementRef = document.createElement('div');
  onSelectionChange: Observable<Selection>;
  onReady: Observable<Document>;

  private selectionChangeEvent = new Subject<Selection>();
  private readyEvent = new Subject<Document>();
  private frame = document.createElement('iframe');
  private selection: TBSelection;

  constructor() {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.onReady = this.readyEvent.asObservable();
    this.frame.onload = () => {
      const doc = this.frame.contentDocument;
      this.selection = new TBSelection(doc);
      this.readyEvent.next(doc);
      this.elementRef.appendChild(this.selection.cursorElementRef);
      this.setup(doc);
    };
    this.frame.src = `javascript:void((function () {
                      document.open();
                      document.domain = '${document.domain}';
                      document.write('${template}');
                      document.close();
                    })())`;


    this.elementRef.classList.add('tanbo-editor-wrap');
    this.frame.classList.add('tanbo-editor-frame');
    this.elementRef.appendChild(this.frame);
  }

  setup(doc: Document) {
    // fromEvent(doc, 'selectionchange').subscribe(() => {
    //   this.selectionChangeEvent.next(doc.getSelection());
    // });
  }
}
