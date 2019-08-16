import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { Editor } from '../../editor/editor';
import { MatchStatus } from '../../matcher';

export class ToggleBlockFormatter extends Formatter {
  constructor(private tagName: string) {
    super();
  }

  format(range: TBRange, editor: Editor, matchStatus: MatchStatus): void {
    range.markRange();

    if (matchStatus.inContainer) {
      const block = this.findBlockContainer(range.commonAncestorContainer, matchStatus.container);

      if (block === matchStatus.container) {
        this.takeOffWrapper(editor.contentDocument, matchStatus.container as HTMLElement);
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
        this.takeOffWrapper(editor.contentDocument, matchStatus.container as HTMLElement);
        newTBRange.removeMarkRange();
      }
    } else {
      const startBlock = this.findBlockContainer(range.startContainer, editor.contentDocument.body);
      const endBlock = this.findBlockContainer(range.endContainer, editor.contentDocument.body);
      const newRange = editor.contentDocument.createRange();
      newRange.setStartBefore(startBlock);
      newRange.setEndAfter(endBlock);
      const newWrap = editor.contentDocument.createElement(this.tagName);
      newRange.surroundContents(newWrap);
    }
    range.removeMarkRange();
  }
}
