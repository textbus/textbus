import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { MatchDescription } from '../../matcher';
import { EditFrame } from '../edit-frame';

export class ListFormatter implements Formatter {
  readonly recordHistory = true;
  readonly document: Document;
  private rawTagKey = '__tanbo_editor_raw_tag__';

  constructor(private tagName: string) {
  }

  format(range: TBRange, frame: EditFrame, matchStatus: MatchDescription): void {
  }

  // format(doc: Document): Range {
  //   (this as { document: Document }).document = doc;
  //   const selection = doc.getSelection();
  //   const rawRange = selection.getRangeAt(0);
  //   const tag = this.tagName;
  //   const parentTagContainer = this.matchContainerByTagName(
  //     rawRange.commonAncestorContainer as HTMLElement,
  //     tag,
  //     this.document.body) as HTMLElement;
  //   if (parentTagContainer) {
  //     console.log('b1');
  //     const cacheMark = this.splitBySelectedRange(rawRange, rawRange.commonAncestorContainer);
  //     const parent = parentTagContainer.parentNode;
  //     const block = this.findBlockContainer(rawRange.commonAncestorContainer as HTMLElement, parentTagContainer);
  //     const containerRange = this.document.createRange();
  //     const nextSibling = parentTagContainer.nextSibling;
  //     const rawTag = parentTagContainer[this.rawTagKey];
  //     if (parentTagContainer === block) {
  //       containerRange.selectNodeContents(block);
  //     } else {
  //       containerRange.selectNode(block);
  //     }
  //
  //     const {before, current, after, startMark, endMark} = this.splitBySelectedRange(containerRange, parentTagContainer);
  //
  //     const beforeContents = before.extractContents();
  //     const afterContents = after.extractContents();
  //
  //     if (nextSibling) {
  //       if (beforeContents.textContent) {
  //         parent.insertBefore(beforeContents, nextSibling);
  //       }
  //       if (rawTag) {
  //         const wrapper = this.document.createElement(rawTag);
  //         wrapper.appendChild(current.extractContents());
  //         parent.insertBefore(wrapper, nextSibling);
  //       } else {
  //         parent.insertBefore(current.extractContents(), nextSibling);
  //       }
  //       if (afterContents.textContent) {
  //         parent.insertBefore(afterContents, nextSibling);
  //       }
  //     } else {
  //       if (beforeContents.textContent) {
  //         parent.appendChild(beforeContents);
  //       }
  //       if (rawTag) {
  //         const wrapper = this.document.createElement(rawTag);
  //         wrapper.appendChild(current.extractContents());
  //         parent.insertBefore(wrapper, nextSibling);
  //       } else {
  //         parent.insertBefore(current.extractContents(), nextSibling);
  //       }
  //       if (afterContents.textContent) {
  //         parent.appendChild(afterContents);
  //       }
  //     }
  //     const s = this.findEmptyContainer(cacheMark.startMark);
  //     const e = this.findEmptyContainer(cacheMark.endMark);
  //     rawRange.setStartAfter(s);
  //     rawRange.setEndBefore(e);
  //     s.parentNode.removeChild(s);
  //     e.parentNode.removeChild(e);
  //     const ss = this.findEmptyContainer(startMark);
  //     const ee = this.findEmptyContainer(endMark);
  //     ss.parentNode.removeChild(ss);
  //     ee.parentNode.removeChild(ee);
  //   } else {
  //
  //     console.log('b2');
  //     const {startMark, current, endMark} = this.splitBySelectedRange(rawRange, rawRange.commonAncestorContainer);
  //     const containerRange = this.document.createRange();
  //     const container = this.findBlockContainer(rawRange.commonAncestorContainer, this.document.body);
  //     containerRange.selectNodeContents(container);
  //     const newContainer = this.createContainerByDtdRule(tag);
  //     newContainer.contentsContainer[this.rawTagKey] = (container as HTMLElement).tagName;
  //
  //     // if(container === this.document.body) {
  //     //
  //     // }
  //
  //     container.parentNode.insertBefore(newContainer.contentsContainer, container);
  //     newContainer.newNode.appendChild(container);
  //     // containerRange.surroundContents(newContainer.newNode);
  //     // newNode.parentNode.replaceChild(newContainer.contentsContainer, newNode);
  //
  //     const s = this.findEmptyContainer(startMark);
  //     const e = this.findEmptyContainer(endMark);
  //     current.setStartAfter(s);
  //     current.setEndBefore(e);
  //     s.parentNode.removeChild(s);
  //     e.parentNode.removeChild(e);
  //   }
  //   return rawRange;
  // }
}
