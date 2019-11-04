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

    fromEvent(context, 'selectstart').subscribe(() => {
      this.selection = context.getSelection();
    });

    fromEvent(context, 'selectionchange').subscribe(() => {
      if (this.selection.isCollapsed) {
        let rect = this.selection.getRangeAt(0).getBoundingClientRect();
        if (!rect.height) {
          rect = (this.selection.focusNode as HTMLElement).getBoundingClientRect();
        }
        this.cursor.show(rect);
      } else {
        this.cursor.hide();
      }
    });
  }
}
