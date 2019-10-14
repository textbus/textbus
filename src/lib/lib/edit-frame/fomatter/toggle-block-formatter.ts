import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { EditFrame } from '../edit-frame';
import { MatchDelta } from '../../matcher';
import { findBlockContainer, takeOffWrapper } from '../utils';

export class ToggleBlockFormatter implements Formatter {
  readonly recordHistory = true;

  constructor(private tagName: string) {
  }

  format(range: TBRange, frame: EditFrame, matchDelta: MatchDelta): void {
    range.markRange();

    if (matchDelta.inSingleContainer) {
      const block = findBlockContainer(range.commonAncestorContainer, matchDelta.scopeContainer);

      if (block === matchDelta.scopeContainer) {
        takeOffWrapper(frame.contentDocument, matchDelta.scopeContainer);
      } else {
        const newRange = frame.contentDocument.createRange();
        newRange.selectNode(block);
        const parent = matchDelta.scopeContainer.parentNode;
        const next = matchDelta.scopeContainer.nextSibling;

        const newTBRange = new TBRange(newRange, frame.contentDocument);

        const {before, after} = newTBRange.getRangesAfterAndBeforeWithinContainer(matchDelta.scopeContainer);

        const beforeContents = before.extractContents();
        const afterContents = after.extractContents();
        if (beforeContents.textContent) {
          parent.insertBefore(beforeContents, matchDelta.scopeContainer);
        }
        if (afterContents.textContent) {
          if (next) {
            parent.insertBefore(afterContents, next);
          } else {
            parent.appendChild(afterContents);
          }
        }
        takeOffWrapper(frame.contentDocument, matchDelta.scopeContainer);
        newTBRange.removeMarkRange();
      }
    } else {
      const startBlock = findBlockContainer(range.startContainer, frame.contentDocument.body);
      const endBlock = findBlockContainer(range.endContainer, frame.contentDocument.body);
      const newRange = frame.contentDocument.createRange();
      newRange.setStartBefore(startBlock);
      newRange.setEndAfter(endBlock);
      const newWrap = frame.contentDocument.createElement(this.tagName);
      newRange.surroundContents(newWrap);
    }
    range.removeMarkRange();
  }
}
