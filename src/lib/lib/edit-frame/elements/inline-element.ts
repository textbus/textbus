import { Observable, Subject, Subscription } from 'rxjs';

import { TBEvenNode, TBNode } from './element';

export class InlineElement implements TBEvenNode {
  get length() {
    return this.children.reduce((p, n) => p + n.length, 0);
  }

  onDestroy: Observable<void>;
  onContentChange: Observable<this>;

  private children: Array<TBNode> = [];
  private destroyEvent = new Subject<void>();
  private contentChangeEvent = new Subject<this>();
  private subMap = new Map<TBNode, Subscription>();

  constructor() {
    this.onContentChange = this.contentChangeEvent.asObservable();
    this.onDestroy = this.destroyEvent.asObservable();
  }

  destroy(): void {
    this.destroyEvent.next();
  }

  render(): DocumentFragment {
    return this.children.reduce((previousValue, currentValue) => {
      previousValue.appendChild(currentValue.render());
      return previousValue
    }, document.createDocumentFragment());
  }

  addNode(node: TBNode, atIndex = this.children.length - 1) {
    this.children.splice(atIndex, 0, node);
    this.subMap.set(node, node.onDestroy.subscribe(() => {
      const index = this.children.indexOf(node);
      if (index > -1) {
        this.children.splice(index, 1);
      }
      this.subMap.delete(node);
    }));
  }
}
