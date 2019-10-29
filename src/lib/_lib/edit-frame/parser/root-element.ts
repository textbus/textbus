import { TBBlockElement, TBEvenNode } from './element';
import { RichText } from './rich-text';
import { dtd } from '../dtd';
import { InlineElement } from './inline-element';
import { BlockElement } from './block-element';
import { TBSelection } from '../selection/selection';
import { Matcher } from '../../matcher';

export interface StyleRegistry {
  token: string;
  matcher: Matcher;
}

export class RootElement extends BlockElement {
  tagName = '#root';
  selection: TBSelection;

  constructor(private context: Document, private registries: StyleRegistry[] = []) {
    super();
    this.selection = new TBSelection(context, this);
  }

  setContents(el: HTMLElement) {
    this.registries.map(item => {
      return {
        token: item.token,
        state: item.matcher.matchNode(el)
      };
    }).forEach(item => {
      this.styleMatrix.set(item.token, [{
        beginIndex: 0,
        closeIndex: item.state ? Infinity : 0
      }]);
    });
    this.createNodeTree(el, this);
    console.log(this);
  }

  private createNodeTree(from: Element, context: BlockElement) {
    Array.from(from.childNodes).forEach(node => {
      if (node.nodeType === 3) {
        context.contents.add(node.textContent);
      } else if (node.nodeType === 1) {
        const tagName = (node as HTMLElement).tagName.toLowerCase();
        this.mergeStyle(node, context.length);
        if (/inline/.test(dtd[tagName].display)) {
          this.createNodeTree(node as Element, context);
        } else {
          this.createNodeTree(node as Element, new BlockElement());
        }
      }
    });
  }

  private mergeStyle(node: Node, beginIndex: number) {
    this.registries.map(item => {
      return {
        token: item.token,
        state: item.matcher.matchNode(node)
      };
    }).forEach(item => {
      const oldStyle = this.styleMatrix.get(item.token);
      oldStyle.push({
        beginIndex,
        closeIndex: item.state ? Infinity : beginIndex
      })
    })
  }
}
