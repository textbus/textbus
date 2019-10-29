import { Cursor } from './cursor';
import { fromEvent } from 'rxjs';

export class TBSelection {
  cursorElementRef: HTMLElement;
  inputNode: Node;
  private cursor: Cursor;

  private selection: Selection;

  constructor(private context: Document) {
    this.cursor = new Cursor(context);
    this.cursorElementRef = this.cursor.elementRef;
    // this.cursorElementRef = document.createElement('span');
    fromEvent(context, 'selectstart').subscribe(() => {
      this.selection = context.getSelection();
    });

    fromEvent(context, 'selectionchange').subscribe(() => {
      console.log(this.selection.rangeCount)
      if (this.selection.isCollapsed) {
        this.cursor.show(this.selection.getRangeAt(0).getBoundingClientRect());
      } else {
        this.cursor.hide();
      }
    });
  }
}
