import { TBEvenNode, TBNode } from './element';
import { Observable, Subject, Subscription } from 'rxjs';
import { RichText } from './rich-text';
import { dtd } from '../dtd';
import { InlineElement } from './inline-element';
import { BlockElement } from './block-element';

export class RootElement implements TBEvenNode {
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

  setContents(el: HTMLElement) {
    this.createNodeTree(el, this);
    console.log(this);
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

  private createNodeTree(from: Element, context: TBEvenNode) {
    Array.from(from.childNodes).forEach(node => {
      if (node.nodeType === 3) {
        if (node.textContent.length) {
          context.addNode(new RichText(node.textContent));
        }
      } else if (node.nodeType === 1) {
        let newNode: TBEvenNode;
        if (/inline/.test(dtd[(node as HTMLElement).tagName.toLowerCase()].display)) {
          newNode = new InlineElement()
        } else {
          newNode = new BlockElement();
        }
        this.createNodeTree(node as Element, newNode);
        context.addNode(newNode);
      }
    });
  }
}
