import { Observable, Subject, Subscription } from 'rxjs';

import { TBNode, TBBlockElement, TBEvent, StyleRange } from './element';
import { Contents } from './contents';

export class BlockElement implements TBBlockElement {
  get length() {
    // return this.children.reduce((p, n) => p + n.length, 0);
    return this.contents.length;
  }

  contents = new Contents();

  styleMatrix = new Map<string, StyleRange[]>();

  elementRef: Node;

  onDestroy: Observable<void>;
  onContentChange: Observable<TBEvent>;

  children: Array<TBNode> = [];
  subMap = new Map<TBNode, Subscription[]>();
  private destroyEvent = new Subject<void>();
  private contentChangeEvent = new Subject<TBEvent>();

  constructor() {
    this.onContentChange = this.contentChangeEvent.asObservable();
    this.onDestroy = this.destroyEvent.asObservable();
  }

  destroy(): void {
    this.destroyEvent.next();
  }

  render(limitParent?: Node) {
    // this.elementRef = limitParent || this.elementRef || document.createElement(this.tagName);
    //
    // (this.elementRef as HTMLElement).innerHTML = '';
    // return this.children.reduce((previousValue, currentValue) => {
    //   previousValue.appendChild(currentValue.render());
    //   return previousValue
    // }, this.elementRef);
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
      node.onContentChange.subscribe(() => {
        this.render();
      })
    ]);
  }
}
