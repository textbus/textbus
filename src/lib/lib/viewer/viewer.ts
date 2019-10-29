import { fromEvent, Observable, Subject } from 'rxjs';

import { template } from './template-html';
import { TBSelection } from '../selection/selection';

export class Viewer {
  elementRef = document.createElement('div');
  onSelectionChange: Observable<Selection>;

  private selectionChangeEvent = new Subject<Selection>();
  private frame = document.createElement('iframe');
  private selection: TBSelection;

  constructor() {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.frame.onload = () => {
      this.selection = new TBSelection(this.frame.contentDocument);
      this.elementRef.appendChild(this.selection.cursorElementRef);
      this.setup(this.frame.contentDocument);
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
