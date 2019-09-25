import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { Editor } from '../../editor/editor';
import { MatchStatus } from '../../matcher';

export class StyleFormatter extends Formatter {
  constructor(private name: string,
              private value: string | number) {
    super();
  }

  format(range: TBRange, editor: Editor, matchStatus: MatchStatus): void {
    if (range.rawRange.collapsed) {
      const newWrap = editor.contentDocument.createElement('span');
      newWrap.style[this.name] = this.value;
      range.rawRange.surroundContents(newWrap);
      newWrap.innerHTML = '&#8203;';
    } else {
      const nodes = this.findCanApplyElements(range.commonAncestorContainer,
        range.rawRange.cloneRange(),
        editor.contentDocument);
      range.markRange();
      nodes.forEach(node => {
        if (node.nodeType === 3) {
          const newWrap = editor.contentDocument.createElement('span');
          newWrap.style[this.name] = this.value;
          node.parentNode.insertBefore(newWrap, node);
          newWrap.appendChild(node);
        } else if (node.nodeType === 1) {
          const el = node as HTMLElement;
          el.style[this.name] = this.value;
          Array.from(el.getElementsByTagName('*')).forEach((item: HTMLElement) => {
            item.style[this.name] = '';
          });
        }
      });
      range.removeMarkRange();
    }
  }

  findCanApplyElements(node: Node, range: Range, context: Document): Node[] {
    if (node.nodeType === 3 && (node.textContent.length === 0 || /^(&#8203;)+$/.test(node.textContent))) {
      return [];
    }
    const nodes: Node[] = [];

    const ranges: Range[] = [];

    const testingRange = context.createRange();
    testingRange.selectNode(node);

    // <div>88888[<span>8888</span>]88888</div>
    ranges.push(testingRange.cloneRange());

    // <div>88888<span>[8888]</span>88888</div>
    testingRange.selectNodeContents(node);
    ranges.push(testingRange.cloneRange());

    // <div>88888[<span>8888]</span>88888</div>
    testingRange.setStartBefore(node);
    ranges.push(this.moveRangeEndMarkToRecentChildTextNode(testingRange.cloneRange()));

    // <div>88888<span>[8888</span>]88888</div>
    testingRange.selectNodeContents(node);
    testingRange.setEndAfter(node);
    ranges.push(testingRange);

    const compare = ranges.map(item => {
      return item.compareBoundaryPoints(range.START_TO_START, range) > -1 &&
        item.compareBoundaryPoints(range.END_TO_END, range) < 1;
    });


    if (compare.indexOf(true) > -1) {
      nodes.push(node);
    } else {
      Array.from((node as HTMLElement).childNodes).forEach(item => {
        nodes.push(...this.findCanApplyElements(item, range, context));
      });
    }
    return nodes;
  }

  private moveRangeEndMarkToRecentChildTextNode(range: Range): Range {
    if (range.endContainer.nodeType === 1) {
      const child = (range.endContainer.childNodes[range.endOffset - 1] as HTMLElement);
      if (child.nodeType === 1) {
        range.setEnd(child, child.childNodes.length);
        this.moveRangeEndMarkToRecentChildTextNode(range);
      } else if (child.nodeType === 3) {
        range.setEnd(child, child.textContent.length);
      }
    }
    return range;
  }
}
