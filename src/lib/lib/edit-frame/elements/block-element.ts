import { Observable } from 'rxjs';

import { TBElement } from './element';

export class BlockElement implements TBElement {
  get length() {
    return this.children.reduce((p, n) => p + n.length, 0);
  }

  onDestroy: Observable<this>;
  onContentChange: Observable<this>;

  private children: Array<TBElement> = [];

  destroy(): void {

  }

  render(): void {

  }

  addNode(node: TBElement) {

  }
}
