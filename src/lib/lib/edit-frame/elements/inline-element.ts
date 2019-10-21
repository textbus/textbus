import { Observable } from 'rxjs';

import { TBElement } from './element';

export class InlineElement implements TBElement {
  get length() {
    return this.children.reduce((p, n) => p + n.length, 0);
  }

  onDestroy: Observable<this>;
  onContentChange: Observable<this>;
  children: Array<TBElement> = [];

  destroy(): void {

  }

  render(): void {

  }
}
