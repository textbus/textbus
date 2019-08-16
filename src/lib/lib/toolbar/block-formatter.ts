import { Formatter } from './formatter';
import { TBRange } from '../range';
import { MatchStatus } from '../matcher';
import { Editor } from '../editor/editor';

export class BlockFormatter extends Formatter {
  constructor(private tagName: string) {
    super();
  }

  format(range: TBRange, editor: Editor, matchStatus: MatchStatus) {
    const doc = editor.contentDocument;
    if (!matchStatus.inContainer) {
      range.markRange();
      const containerRange = doc.createRange();
      const container = this.findBlockContainer(range.commonAncestorContainer, doc.body);
      containerRange.selectNodeContents(container);
      const newContainer = doc.createElement(this.tagName);
      containerRange.surroundContents(newContainer);
      if (container !== doc.body) {
        container.parentNode.replaceChild(newContainer, container);
      }
      range.removeMarkRange();
    }
  }
}
