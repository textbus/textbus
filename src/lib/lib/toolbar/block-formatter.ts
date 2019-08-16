import { Formatter } from './formatter';
import { dtd } from '../editor/dtd';
import { TBRange } from '../range';
import { MatchStatus } from '../matcher';
import { Editor } from '../editor/editor';

export class BlockFormatter extends Formatter {
  private rawTagKey = '__tanbo_editor_raw_tag__';

  constructor(private tagName: string) {
    super();
  }

  format(range: TBRange, editor: Editor, matchStatus: MatchStatus) {
    // const doc = editor.contentDocument;
    // const tag = this.tagName;
    //
    // if (matchStatus.inContainer) {
    //   console.log('b1');
    //   const parent = matchStatus.container.parentNode;
    //   const block = this.findBlockContainer(range.rawRange.commonAncestorContainer as HTMLElement, matchStatus.container);
    //   const containerRange = doc.createRange();
    //   const nextSibling = matchStatus.container.nextSibling;
    //   const rawTag = matchStatus.container[this.rawTagKey];
    //   if (matchStatus.container === block) {
    //     containerRange.selectNodeContents(block);
    //   } else {
    //     containerRange.selectNode(block);
    //   }
    //
    //   const newTBRange = new TBRange(containerRange, doc);
    //   const {before, after} = newTBRange.markRange()
    //     .getBeforeAndAfterInContainer(containerRange.commonAncestorContainer as HTMLElement);
    //
    //   const beforeContents = before.extractContents();
    //   const afterContents = after.extractContents();
    //
    //   if (nextSibling) {
    //     if (beforeContents.textContent) {
    //       parent.insertBefore(beforeContents, nextSibling);
    //     }
    //     if (rawTag) {
    //       const wrapper = this.document.createElement(rawTag);
    //       wrapper.appendChild(containerRange.extractContents());
    //       parent.insertBefore(wrapper, nextSibling);
    //     } else {
    //       parent.insertBefore(containerRange.extractContents(), nextSibling);
    //     }
    //     if (afterContents.textContent) {
    //       parent.insertBefore(afterContents, nextSibling);
    //     }
    //   } else {
    //     if (beforeContents.textContent) {
    //       parent.appendChild(beforeContents);
    //     }
    //     if (rawTag) {
    //       const wrapper = doc.createElement(rawTag);
    //       wrapper.appendChild(containerRange.extractContents());
    //       parent.insertBefore(wrapper, nextSibling);
    //     } else {
    //       parent.insertBefore(containerRange.extractContents(), nextSibling);
    //     }
    //     if (afterContents.textContent) {
    //       parent.appendChild(afterContents);
    //     }
    //   }
    //   range.apply();
    //   newTBRange.removeMarkRange();
    // } else {
    //
    //   console.log('b2');
    //   const {startMark, current, endMark} = this.splitBySelectedRange(range, range.commonAncestorContainer);
    //   const containerRange = doc.createRange();
    //   const container = this.findBlockContainer(range.commonAncestorContainer, doc.body);
    //   containerRange.selectNodeContents(container);
    //   const newContainer = doc.createElement(tag);
    //   containerRange.surroundContents(newContainer);
    //   console.log(container);
    //   if (container !== doc.body) {
    //     newContainer[this.rawTagKey] = (container as HTMLElement).tagName;
    //     container.parentNode.replaceChild(newContainer, container);
    //   } else {
    //     newContainer[this.rawTagKey] = tag;
    //   }
    //
    //   const s = this.findEmptyContainer(startMark);
    //   const e = this.findEmptyContainer(endMark);
    //   current.setStartAfter(s);
    //   current.setEndBefore(e);
    //   s.parentNode.removeChild(s);
    //   e.parentNode.removeChild(e);
    // }
    // return range;
  }
}
