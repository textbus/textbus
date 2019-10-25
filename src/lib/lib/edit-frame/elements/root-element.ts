import { Attr, Style, TBEvenNode, TBNode } from './element';
import { Observable, Subject, Subscription } from 'rxjs';
import { RichText } from './rich-text';
import { dtd } from '../dtd';
import { InlineElement } from './inline-element';
import { BlockElement } from './block-element';
import { TBSelection } from '../selection/selection';

export class RootElement implements TBEvenNode {
  get length() {
    return this.children.reduce((p, n) => p + n.length, 0);
  }

  elementRef: Node;
  onDestroy: Observable<void>;
  onContentChange: Observable<this>;
  attrs: Attr[] = [];
  styles: Style[] = [];
  classes: string[] = [];
  parentNode: TBEvenNode = null;
  tagName = '#root';
  selection: TBSelection;
  private children: Array<TBNode> = [];
  private destroyEvent = new Subject<void>();
  private contentChangeEvent = new Subject<this>();
  private subMap = new Map<TBNode, Subscription>();

  constructor(private context: Document) {
    this.selection = new TBSelection(context, this);
    this.onContentChange = this.contentChangeEvent.asObservable();
    this.onDestroy = this.destroyEvent.asObservable();
  }

  setContents(el: HTMLElement) {
    this.createNodeTree(el, this);
    console.log(this);
    console.log(this.render())
  }

  destroy(): void {
    this.destroyEvent.next();
  }

  render(): Node {
    return this.children.reduce((previousValue, currentValue) => {
      previousValue.appendChild(currentValue.render());
      return previousValue
    }, document.createDocumentFragment());
  }

  addNode(node: TBNode, atIndex = this.children.length) {
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
        const tagName = (node as HTMLElement).tagName.toLowerCase();
        if (/inline/.test(dtd[tagName].display)) {
          newNode = new InlineElement(context, tagName)
        } else {
          newNode = new BlockElement(context, tagName);
        }
        const properties = ((node: HTMLElement) => {
          const attrs: Attr[] = Array.from(node.attributes).map(item => {
            return {
              name: item.name,
              value: item.value
            };
          });
          const classes = Array.from(node.classList);
          const styleText = node.getAttribute('style');
          const styles = styleText ? styleText.split(';').map(style => {
            const a = style.split(':');
            return {
              name: a[0].trim(),
              value: a[1].trim()
            };
          }) : [];
          return {
            attrs,
            classes,
            styles
          }
        })(node as HTMLElement);

        Object.assign(newNode, properties);

        this.createNodeTree(node as Element, newNode);
        context.addNode(newNode);
      }
    });
  }
}
