import { Observable, Subject, Subscription } from 'rxjs';

import { TBEvenNode, TBNode, Attr, Style } from './element';

export class BlockElement implements TBEvenNode {
  get length() {
    return this.children.reduce((p, n) => p + n.length, 0);
  }

  elementRef: Node;
  attrs: Attr[] = [];
  styles: Style[] = [];
  classes: string[] = [];

  onDestroy: Observable<void>;
  onContentChange: Observable<this>;

  private children: Array<TBNode> = [];
  private destroyEvent = new Subject<void>();
  private contentChangeEvent = new Subject<this>();
  private subMap = new Map<TBNode, Subscription[]>();

  constructor(public parentNode: TBEvenNode, public tagName: string) {
    this.onContentChange = this.contentChangeEvent.asObservable();
    this.onDestroy = this.destroyEvent.asObservable();
  }

  destroy(): void {
    this.destroyEvent.next();
  }

  render(limitParent?: Node): Node {
    this.elementRef = limitParent || this.elementRef || document.createElement(this.tagName);

    (this.elementRef as HTMLElement).innerHTML = '';
    return this.children.reduce((previousValue, currentValue) => {
      previousValue.appendChild(currentValue.render());
      return previousValue
    }, this.elementRef);
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
