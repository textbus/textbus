import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { Frame } from '../frame';
import { MatchStatus } from '../../matcher';
import { findBlockContainer } from '../utils';

export class BlockStyleFormatter implements Formatter {
  constructor(private name: string,
              private value: string | number) {
  }

  format(range: TBRange, frame: Frame, matchStatus: MatchStatus): void {
    const nodes = this.findCanApplyElements(range.commonAncestorContainer,
      range.rawRange.cloneRange(),
      frame.contentDocument).map(item => {
      return findBlockContainer(item, range.commonAncestorContainer)
    });
    ([...new Set(nodes)] as Array<HTMLElement>).forEach(node => {
      node.style[this.name] = this.value;
      Array.from(node.getElementsByTagName('*')).forEach((item: HTMLElement) => {
        item.style[this.name] = '';
      });
    });
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
    ranges.push(testingRange.cloneRange());

    // <div>88888<span>[8888</span>]88888</div>
    testingRange.selectNodeContents(node);
    testingRange.setEndAfter(node);
    ranges.push(testingRange);

    const compare = ranges.map(item => {
      return item.compareBoundaryPoints(range.START_TO_START, range) > -1 ||
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
}
