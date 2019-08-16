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
    const newRange = context.createRange();
    newRange.selectNode(node);
    console.log([
      range.compareBoundaryPoints(range.START_TO_START, newRange),
      range.compareBoundaryPoints(range.END_TO_END, newRange)
    ], node);
    const compare = [
      range.compareBoundaryPoints(range.START_TO_START, newRange) === 0,
      range.compareBoundaryPoints(range.END_TO_END, newRange) === 0
    ].indexOf(false) === -1;

    if (compare) {
      nodes.push(node);
    } else {
      if (node.nodeType === 1) {
        Array.from((node as HTMLElement).childNodes).forEach(item => {
          nodes.push(...this.findCanApplyElements(item, range, context));
        });
      }
    }
    return nodes;
  }
}
