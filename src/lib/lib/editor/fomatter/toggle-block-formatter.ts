import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { Editor } from '../editor';
import { MatchStatus } from '../../matcher';
import { findBlockContainer, takeOffWrapper } from '../utils';

export class ToggleBlockFormatter implements Formatter {
  constructor(private tagName: string) {
  }

  format(range: TBRange, editor: Editor, matchStatus: MatchStatus): void {
    range.markRange();

    if (matchStatus.inContainer) {
      const block = findBlockContainer(range.commonAncestorContainer, matchStatus.container);

      if (block === matchStatus.container) {
        takeOffWrapper(editor.contentDocument, matchStatus.container as HTMLElement);
      } else {
        const newRange = editor.contentDocument.createRange();
        newRange.selectNode(block);
        const parent = matchStatus.container.parentNode;
        const next = matchStatus.container.nextSibling;

        const newTBRange = new TBRange(newRange, editor.contentDocument);

        const {before, after} = newTBRange.getRangesAfterAndBeforeWithinContainer(matchStatus.container);

        const beforeContents = before.extractContents();
        const afterContents = after.extractContents();
        if (beforeContents.textContent) {
          parent.insertBefore(beforeContents, matchStatus.container);
        }
        if (afterContents.textContent) {
          if (next) {
            parent.insertBefore(afterContents, next);
          } else {
            parent.appendChild(afterContents);
          }
        }
        takeOffWrapper(editor.contentDocument, matchStatus.container as HTMLElement);
        newTBRange.removeMarkRange();
      }
    } else {
      const startBlock = findBlockContainer(range.startContainer, editor.contentDocument.body);
      const endBlock = findBlockContainer(range.endContainer, editor.contentDocument.body);
      const newRange = editor.contentDocument.createRange();
      newRange.setStartBefore(startBlock);
      newRange.setEndAfter(endBlock);
      const newWrap = editor.contentDocument.createElement(this.tagName);
      newRange.surroundContents(newWrap);
    }
    range.removeMarkRange();
  }
}
