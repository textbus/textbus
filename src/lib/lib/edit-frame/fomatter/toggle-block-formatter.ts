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
      const block = findBlockContainer(range.commonAncestorContainer, matchDelta.container);

      if (block === matchDelta.container) {
        takeOffWrapper(frame.contentDocument, matchDelta.container as HTMLElement);
      } else {
        const newRange = frame.contentDocument.createRange();
        newRange.selectNode(block);
        const parent = matchDelta.container.parentNode;
        const next = matchDelta.container.nextSibling;

        const newTBRange = new TBRange(newRange, frame.contentDocument);

        const {before, after} = newTBRange.getRangesAfterAndBeforeWithinContainer(matchDelta.container);

        const beforeContents = before.extractContents();
        const afterContents = after.extractContents();
        if (beforeContents.textContent) {
          parent.insertBefore(beforeContents, matchDelta.container);
        }
        if (afterContents.textContent) {
          if (next) {
            parent.insertBefore(afterContents, next);
          } else {
            parent.appendChild(afterContents);
          }
        }
        takeOffWrapper(frame.contentDocument, matchDelta.container as HTMLElement);
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
