import { Observable, Subject } from 'rxjs';

import { TBEvent, TBNode } from './element';

export class SourceElement implements TBNode {
  readonly length = 1;
  elementRef: Node;
  onDestroy: Observable<void>;
  onContentChange: Observable<TBEvent>;
  private destroyEvent = new Subject<void>();
  private contentChangeEvent = new Subject<TBEvent>();

  constructor() {
    this.onContentChange = this.contentChangeEvent.asObservable();
    this.onDestroy = this.destroyEvent.asObservable();
  }

  destroy(): void {

  }
}
