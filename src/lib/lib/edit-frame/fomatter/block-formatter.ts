import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { MatchStatus } from '../../matcher';
import { EditFrame } from '../edit-frame';
import { findBlockContainer } from '../utils';

export class BlockFormatter implements Formatter {
  constructor(private tagName: string) {
  }

  format(range: TBRange, frame: EditFrame, matchStatus: MatchStatus) {
    const doc = frame.contentDocument;
    if (!matchStatus.inContainer) {
      range.markRange();
      const containerRange = doc.createRange();
      const container = findBlockContainer(range.commonAncestorContainer, doc.body);
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
