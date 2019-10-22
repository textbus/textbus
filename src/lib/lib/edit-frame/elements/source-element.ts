import { Observable, Subject } from 'rxjs';

import { TBNode } from './element';

export class SourceElement implements TBNode {
  readonly length = 1;
  onDestroy: Observable<void>;
  onContentChange: Observable<this>;
  private destroyEvent = new Subject<void>();
  private contentChangeEvent = new Subject<this>();

  constructor() {
    this.onContentChange = this.contentChangeEvent.asObservable();
    this.onDestroy = this.destroyEvent.asObservable();
  }

  destroy(): void {

  }

  render(): DocumentFragment | Node {
    return document.createElement('div');
  }
}
