import { dtd } from '../dtd';
import { Fragment, FormatRange } from './fragment';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { SingleNode } from './single-node';

export class Parser extends Fragment {
  constructor(private context: Document, private registries: Handler[] = []) {
    super('#root');
  }

  setContents(el: HTMLElement) {
    const len = Array.from(el.childNodes).reduce((len, node) => {
      return len + this.parse(node, this);
    }, 0);
    this.mergeFormatsByNode(this, el, 0, len);
  }

  private parse(from: Node, context: Fragment): number {
    if (from.nodeType === 3) {
      const textContent = from.textContent;
      context.contents.add(textContent);
      return textContent.length;
    } else if (from.nodeType === 1) {
      const tagName = (from as HTMLElement).tagName.toLowerCase();
      if (/inline/.test(dtd[tagName].display)) {
        const start = context.length;
        if (dtd[tagName].type === 'single') {
          const attrs = Array.from((from as HTMLElement).attributes);
          const newSingle = new SingleNode(tagName, attrs);
          context.contents.add(newSingle);
          return 1;
        } else {
          const len = this.parse(from, context);
          this.mergeFormatsByNode(context, from, start, len);
          return len;
        }
      } else {
        const newBlock = new Fragment(tagName);

        const len = Array.from(from.childNodes).reduce((len, node) => {
          return len + this.parse(node, newBlock);
        }, 0);
        this.mergeFormatsByNode(newBlock, from, 0, len);
        context.contents.add(newBlock);
        return len;
      }
    }
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
