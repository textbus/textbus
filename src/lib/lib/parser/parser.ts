import { dtd } from '../dtd';
import { Fragment, StyleRange } from './fragment';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';

export class Parser extends Fragment {
  constructor(private context: Document, private registries: Handler[] = []) {
    super();
  }

  setContents(el: HTMLElement) {
    const len = this.parse(el, this);
    this.mergeStyleByNode(this, el, 0, len);
    console.log(this);
    this.ast();
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
          this.mergeStyleByNode(context, node, start, len);
        } else {
          const newBlock = dtd[tagName].limitChildren ? new Fragment(tagName) : new Fragment();
          len = this.parse(node as Element, newBlock);
          this.mergeStyleByNode(context, node, context.length, len);
          this.mergeStyleByNode(newBlock, node, 0, len);
          context.contents.add(newBlock);
        }
        return len + value;
      }
      return value;
    }, 0);
  }

  private mergeStyleByNode(context: Fragment, by: Node, startIndex: number, len: number) {
    return this.registries.map(item => {
      return {
        token: item,
        state: item.matcher.matchNode(by)
      };
    }).filter(item => item.state !== MatchState.Normal).forEach(item => {
      const oldStyle = context.styleMatrix.get(item.token);
      let styleMatrix: StyleRange[] = [];

      const newRange = new StyleRange(startIndex, startIndex + len, item.state, item.token, context);
      if (oldStyle) {
        const styleMarks: MatchState[] = [];
        oldStyle.push(newRange);
        let index = oldStyle.length - 1;
        while (index >= 0) {
          const item = oldStyle[index];
          if (styleMarks.length < item.endIndex) {
            styleMarks.length = item.endIndex;
          }
          styleMarks.fill(item.state, item.startIndex, item.endIndex);
          index--;
        }
        let newStyleRange: StyleRange = null;
        for (let i = 0; i < styleMarks.length; i++) {
          const mark = styleMarks[i];
          // if (mark === MatchState.Matched) {
          //   if (!newStyleRange) {
          //     newStyleRange = new StyleRange(i, i + 1, mark, item.token, context);
          //     styleMatrix.push(newStyleRange);
          //   } else {
          //     newStyleRange.endIndex = i + 1;
          //   }
          // } else {
          //   newStyleRange = null;
          // }

          if (!mark) {
            continue;
          }
          if (!newStyleRange) {
            newStyleRange = new StyleRange(i, i + 1, mark, item.token, context);
            styleMatrix.push(newStyleRange);
            continue;
          }
          if (mark === newStyleRange.state) {
            newStyleRange.endIndex = i + 1;
          } else {
            newStyleRange = new StyleRange(i, i + 1, mark, item.token, context);
            styleMatrix.push(newStyleRange);
          }
        }
      } else {
        styleMatrix.push(newRange);
      }
      context.styleMatrix.set(item.token, styleMatrix);
    })
  }
}
