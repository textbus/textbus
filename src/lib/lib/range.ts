export class TBRange {
  readonly range: Range;

  private startMark = document.createElement('span');
  private endMark = document.createElement('span');

  private marked = false;

  constructor(rawRange: Range, private context: Document) {
    this.range = rawRange;
    const range = this.range;
    const beforeRange = this.context.createRange();
    const afterRange = this.context.createRange();

    if (range.startContainer.nodeType === 3) {
      const startParent = range.startContainer.parentNode;
      beforeRange.setStart(range.startContainer, 0);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      startParent.insertBefore(beforeRange.extractContents(), range.startContainer);
    }

    if (range.endContainer.nodeType === 3) {
      const nextSibling = range.endContainer.nextSibling;
      const endParent = range.endContainer.parentNode;

      afterRange.setStart(range.endContainer, range.endOffset);
      afterRange.setEndAfter(range.endContainer);

      const contents = afterRange.extractContents();
      if (nextSibling) {
        endParent.insertBefore(contents, nextSibling);
      } else {
        endParent.appendChild(contents);
      }
    }
  }

  markRange() {
    if (!this.marked) {
      const {startContainer, endContainer} = this.range;
      const startParent = startContainer.parentNode;
      const endParent = endContainer.parentNode;
      const endNext = endContainer.nextSibling;
      startParent.insertBefore(this.startMark, this.range.startContainer);
      if (endNext) {
        endParent.insertBefore(this.endMark, endNext);
      } else {
        endParent.appendChild(this.endMark);
      }
      this.marked = true;
    }
    return this;
  }

  removeMarkRange() {
    if (this.marked) {
      const s = this.findEmptyContainer(this.startMark);
      const e = this.findEmptyContainer(this.endMark);
      this.range.setStartAfter(s);
      this.range.setEndBefore(e);
      s.parentNode.removeChild(s);
      e.parentNode.removeChild(e);
      this.marked = false;
    }
    return this;
  }

  apply() {
    const selection = this.context.getSelection();
    selection.removeAllRanges();
    selection.addRange(this.range);
  }

  getBeforeAndAfterInContainer(scope: HTMLElement): { before: Range, after: Range } {
    const beforeRange = this.context.createRange();
    const afterRange = this.context.createRange();

    beforeRange.setStartBefore(scope);
    if (this.marked) {
      beforeRange.setEndBefore(this.startMark);
      afterRange.setStartAfter(this.endMark);
    } else {
      beforeRange.setEnd(this.range.startContainer, this.range.startOffset);
      afterRange.setEnd(this.range.endContainer, this.range.endOffset);
    }
    return {
      before: beforeRange,
      after: afterRange
    };
  }

  private findEmptyContainer(node: Node): Node {
    if ((node.parentNode as HTMLElement).innerText) {
      return node;
    }
    return this.findEmptyContainer(node.parentNode);
  }
}
