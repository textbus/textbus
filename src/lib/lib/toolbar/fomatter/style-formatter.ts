import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { Editor } from '../../editor/editor';
import { MatchStatus } from '../../matcher';

export class StyleFormatter extends Formatter {
  constructor(private name: string,
              private value: string | number,
              private canTakeEffectInline: boolean) {
    super();
  }

  format(range: TBRange, editor: Editor, matchStatus: MatchStatus): void {
    range.markRange();
    this.findCanApplyElements(range.commonAncestorContainer, range.rawRange, editor.contentDocument).forEach(node => {
      if (node.nodeType === 3) {
        const newWrap = editor.contentDocument.createElement('span');
        newWrap.style[this.name] = this.value;
        node.parentNode.insertBefore(newWrap, node);
        newWrap.appendChild(node);
      } else if (node.nodeType === 1) {
        (node as HTMLElement).style[this.name] = this.value;
      }
    });
    range.removeMarkRange();
  }

  findCanApplyElements(node: Node, range: Range, context: Document): Node[] {
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
    ranges.push(testingRange.cloneRange());

    // <div>88888<span>[8888</span>]88888</div>
    testingRange.selectNodeContents(node);
    testingRange.setEndAfter(node);
    ranges.push(testingRange);

    // console.log(JSON.stringify(ranges.map(item => {
    //   return item.compareBoundaryPoints(range.START_TO_START, range) > -1 &&
    //     item.compareBoundaryPoints(range.END_TO_END, range) < 1;
    // })), node);

    const compare = ranges.map(item => {
      return item.compareBoundaryPoints(range.START_TO_START, range) > -1 &&
        item.compareBoundaryPoints(range.END_TO_END, range) < 1;
    }).indexOf(true) > -1;

    if (compare) {
      nodes.push(node);
    } else {
      Array.from((node as HTMLElement).childNodes).forEach(item => {
        nodes.push(...this.findCanApplyElements(item, range, context));
      });
    }
    return nodes;
  }
}
