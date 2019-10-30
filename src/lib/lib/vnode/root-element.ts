import { dtd } from '../dtd';
import { BlockElement } from './block-element';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { StyleRange } from './element';

export class RootElement extends BlockElement {
  tagName = '#root';

  constructor(private context: Document, private registries: Handler[] = []) {
    super();
  }

  setContents(el: HTMLElement) {
    this.createNodeTree(el, this);
    console.log(this);
  }

  private createNodeTree(from: Element, context: BlockElement, fromSelf = true) {
    const len = Array.from(from.childNodes).reduce((value, node) => {
      if (node.nodeType === 3) {
        context.contents.add(node.textContent);
        return node.textContent.length + value;
      } else if (node.nodeType === 1) {
        const tagName = (node as HTMLElement).tagName.toLowerCase();
        let len: number;
        if (/inline/.test(dtd[tagName].display)) {
          let start = context.length;
          len = this.createNodeTree(node as Element, context, false);
          this.mergeStyleByNode(context, node, start, len);
        } else {
          const newBlock = dtd[tagName].limitChildren ? new BlockElement(tagName) : new BlockElement();
          len = this.createNodeTree(node as Element, newBlock);
          this.mergeStyleByNode(context, node, context.length, len);
          context.contents.add(newBlock);
        }
        return len + value;
      }
      return value;
    }, 0);
    if (fromSelf) {
      this.mergeStyleByNode(context, from, 0, len);
    }
    return len;
  }

  private mergeStyleByNode(context: BlockElement, by: Node, startIndex: number, len: number) {
    return this.registries.map(item => {
      return {
        token: item,
        state: item.matcher.matchNode(by)
      };
    }).forEach(item => {
      const oldStyle = context.styleMatrix.get(item.token);
      let styleMatrix: StyleRange[] = [];

      const newRange: StyleRange = {
        state: item.state,
        startIndex: startIndex,
        endIndex: startIndex + len
      };
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
          const item = styleMarks[i];
          if (!item) {
            continue;
          }
          if (!newStyleRange) {
            newStyleRange = {
              state: item,
              startIndex: i,
              endIndex: i + 1
            };
            styleMatrix.push(newStyleRange);
            continue;
          }
          if (item === newStyleRange.state) {
            newStyleRange.endIndex = i + 1;
          } else {
            newStyleRange = {
              state: item,
              startIndex: i,
              endIndex: i + 1
            };
            styleMatrix.push(newStyleRange);
          }
        }
      } else {
        styleMatrix.push({
          state: item.state,
          startIndex: startIndex,
          endIndex: startIndex + len
        });
      }
      context.styleMatrix.set(item.token, styleMatrix);
    })
  }
}
