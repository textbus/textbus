import { Observable, Subject, Subscription } from 'rxjs';

import { TBEvenNode, TBEvent, TBNode } from './element';

export class InlineElement implements TBEvenNode {
  get length() {
    return this.children.reduce((p, n) => p + n.length, 0);
  }
  elementRef: Node;
  onDestroy: Observable<void>;
  onContentChange: Observable<TBEvent>;

  private children: Array<TBNode> = [];
  private destroyEvent = new Subject<void>();
  private contentChangeEvent = new Subject<TBEvent>();
  private subMap = new Map<TBNode, Subscription[]>();

  constructor(public parentNode: TBEvenNode, public tagName: string) {
    this.onContentChange = this.contentChangeEvent.asObservable();
    this.onDestroy = this.destroyEvent.asObservable();
  }

  destroy(): void {
    this.destroyEvent.next();
  }

  addNode(node: TBNode, atIndex = this.children.length) {
    this.children.splice(atIndex, 0, node);
    this.subMap.set(node, [
      node.onDestroy.subscribe(() => {
        const index = this.children.indexOf(node);
        if (index > -1) {
          this.children.splice(index, 1);
        }
        this.subMap.delete(node);
      }),
      node.onContentChange.subscribe((ev) => {
        this.contentChangeEvent.next(ev);
      })
    ]);
  }
}
