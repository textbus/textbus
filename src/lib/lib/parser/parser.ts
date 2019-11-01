import { dtd } from '../dtd';
import { Fragment, FormatRange } from './fragment';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';

export class Parser extends Fragment {
  constructor(private context: Document, private registries: Handler[] = []) {
    super('body');
  }

  setContents(el: HTMLElement) {
    const len = this.parse(el, this);
    this.mergeFormatsByNode(this, el, 0, len);
    const result = this.render();
    document.body.appendChild(result)
  }

  private parse(from: Element, context: Fragment) {
    return Array.from(from.childNodes).reduce((value, node) => {
      if (node.nodeType === 3) {
        context.contents.add(node.textContent);
        return node.textContent.length + value;
      } else if (node.nodeType === 1) {
        const tagName = (node as HTMLElement).tagName.toLowerCase();
        let len: number;
        if (/inline/.test(dtd[tagName].display)) {
          let start = context.length;
          len = this.parse(node as Element, context);
          this.mergeFormatsByNode(context, node, start, len);
        } else {
          const newBlock = new Fragment(tagName);
          // const newBlock = dtd[tagName].limitChildren ? new Fragment(tagName) : new Fragment();
          len = this.parse(node as Element, newBlock);
          this.mergeFormatsByNode(newBlock, node, 0, len);
          context.contents.add(newBlock);
        }
        return len + value;
      }
      return value;
    }, 0);
  }

  private mergeFormatsByNode(context: Fragment, by: Node, startIndex: number, len: number) {
    this.registries.map(item => {
      return {
        token: item,
        state: item.matcher.matchNode(by)
      };
    }).filter(item => item.state !== MatchState.Normal).forEach(item => {
      const newRange = new FormatRange(startIndex, startIndex + len, item.state, item.token, context);
      context.mergeFormat(newRange);
    })
  }
}
