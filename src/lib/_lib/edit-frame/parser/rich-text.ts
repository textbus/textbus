import { Observable, Subject } from 'rxjs';
import { TBNode, TBEvent } from './element';

export class RichText implements TBNode {
  get length() {
    return this.text.length;
  }

  elementRef: Node;
  onDestroy: Observable<void>;
  onContentChange: Observable<TBEvent>;

  private destroyEvent = new Subject<void>();
  private contentChangeEvent = new Subject<TBEvent>();

  constructor(public text = '') {
    this.onContentChange = this.contentChangeEvent.asObservable();
    this.onDestroy = this.destroyEvent.asObservable();
  }

  destroy(): void {
    this.destroyEvent.next();
  }

  addContent(char: string, atIndex = this.length) {
    const before = this.text.slice(0, atIndex);
    const after = this.text.slice(atIndex);
    this.text = before + char + after;
    this.contentChangeEvent.next({
      target: this
    });
  }

  deleteContent(startIndex: number, endIndex = this.length) {
    const before = this.text.slice(0, startIndex);
    const after = this.text.slice(endIndex);
    this.text = before + after;
  }
}
