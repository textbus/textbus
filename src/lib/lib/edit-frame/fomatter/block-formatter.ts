import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { MatchDescription } from '../../matcher';
import { EditFrame } from '../edit-frame';
import { findBlockContainer } from '../utils';

export class BlockFormatter implements Formatter {
  readonly recordHistory = true;

  constructor(private tagName: string) {
  }

  format(range: TBRange, frame: EditFrame, matchDescription: MatchDescription) {
    const doc = frame.contentDocument;
    if (!matchDescription.inSingleContainer) {
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
