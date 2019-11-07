import { Observable, Subject } from 'rxjs';

import { template } from './template-html';
import { TBSelection } from '../selection/selection';
import { Hooks } from '../toolbar/help';
import { Parser } from '../parser/parser';
import { Handler } from '../toolbar/handlers/help';

export class ViewRenderer {
  elementRef = document.createElement('div');
  onSelectionChange: Observable<TBSelection>;
  onReady: Observable<Document>;

  contentWindow: Window;
  contentDocument: Document;

  private selectionChangeEvent = new Subject<TBSelection>();
  private readyEvent = new Subject<Document>();
  private frame = document.createElement('iframe');
  private selection: TBSelection;
  private hooksList: Hooks[] = [];

  constructor() {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.onReady = this.readyEvent.asObservable();
    this.frame.onload = () => {
      const doc = this.frame.contentDocument;
      this.contentDocument = doc;
      this.contentWindow = this.frame.contentWindow;
      this.selection = new TBSelection(doc);
      this.readyEvent.next(doc);
      this.elementRef.appendChild(this.selection.cursorElementRef);

      this.selection.onSelectionChange.subscribe(s => {
        this.selectionChangeEvent.next(s);
      })
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

  render(vDom: Parser) {
    this.contentDocument.documentElement.replaceChild(vDom.render(), this.contentDocument.body);
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

  apply(handler: Handler) {
    const commonAncestorFragment = this.selection.commonAncestorFragment;
    const oldEl = commonAncestorFragment.elementRef;

    const overlap = this.selection.ranges.reduce((v, next) => {
      return v && next.commonAncestorFragment.queryState(next.startIndex, next.endIndex, handler);
    }, true);

    handler.execCommand.command(this.selection, commonAncestorFragment, handler, overlap);
    const newNode = commonAncestorFragment.render();
    oldEl.parentNode.replaceChild(newNode, oldEl);
    this.selection.apply();
  }
}
