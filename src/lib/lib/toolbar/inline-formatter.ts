import { Formatter } from './formatter';

export class InlineFormatter extends Formatter {
  readonly doc: Document;

  constructor(private tagName: string) {
    super();
  }

  format(doc: Document): Range {
    (this as { doc: Document }).doc = doc;
    const selection = doc.getSelection();
    const range = selection.getRangeAt(0);
    const tag = this.tagName;

    const parentTagContainer = this.matchContainerByTagName(
      range.commonAncestorContainer as HTMLElement,
      tag,
      doc.body) as HTMLElement;

    if (parentTagContainer) {
      if (range.collapsed) {
        return;
      }

      const {current, before, after, endMark, startMark} = this.splitBySelectedRange(range, parentTagContainer);

      this.wrap(before, tag);
      this.wrap(after, tag);
      this.takeOffWrapper(parentTagContainer);
      before.detach();
      after.detach();
      current.setStartAfter(startMark);
      current.setEndBefore(endMark);

      startMark.parentNode.removeChild(startMark);
      endMark.parentNode.removeChild(endMark);
    } else {
      if (range.commonAncestorContainer.nodeType === 3) {
        const newWrap = doc.createElement(tag);
        const isCollapsed = range.collapsed;
        range.surroundContents(newWrap);
        if (isCollapsed) {
          newWrap.innerHTML = '&#8203;';
          range.selectNodeContents(newWrap);
        }
      } else if (range.commonAncestorContainer.nodeType === 1) {
        console.log(3)
        const {before, current, after, startMark, endMark} = this.splitBySelectedRange(range, range.commonAncestorContainer as Element);

        const textNodes = this.getTextNodes(current.commonAncestorContainer as HTMLElement, tag).filter(node => {
          return current.intersectsNode(node);
        });
        if (textNodes.length) {
          current.setStartBefore(startMark);
          current.setEndAfter(endMark);
          this.unWrap(current, tag);
          current.setStartAfter(startMark);
          current.setEndBefore(endMark);
          this.wrap(current, tag);
          console.log(4)
        } else {
          console.log(5)
          this.unWrap(current, tag);
        }
        before.detach();
        after.detach();
        const s = this.findEmptyContainer(startMark);
        const e = this.findEmptyContainer(endMark);
        current.setStartAfter(s);
        current.setEndBefore(e);
        s.parentNode.removeChild(s);
        e.parentNode.removeChild(e);
      }
    }
    return range;
  }

  private wrap(range: Range, tag: string) {
    this.getTextNodes(range.commonAncestorContainer as Element).filter(item => {
      if (!item.textContent) {
        item.parentNode.removeChild(item);
        return false;
      }
      return range.intersectsNode(item);
    }).forEach(item => {
      const wrap = this.doc.createElement(tag);
      item.parentNode.replaceChild(wrap, item);
      wrap.appendChild(item);
    });
  }

  private unWrap(range: Range, tag: string) {
    const start = this.matchContainerByTagName(range.startContainer, tag, range.commonAncestorContainer);
    const end = this.matchContainerByTagName(range.endContainer, tag, range.commonAncestorContainer);

    if (start) {
      const startRange = this.doc.createRange();
      startRange.setStartBefore(start);
      startRange.setEnd(range.startContainer, range.startOffset);
      start.parentNode.insertBefore(startRange.extractContents(), start);
    }
    if (end) {
      const endRange = this.doc.createRange();
      endRange.setStart(range.endContainer, range.endOffset);
      endRange.setEndAfter(end);
      if (end.nextSibling) {
        end.parentNode.insertBefore(endRange.extractContents(), end.nextSibling);
      } else {
        end.parentNode.appendChild(endRange.extractContents());
      }
    }

    Array.from((range.commonAncestorContainer as HTMLElement).getElementsByTagName(tag))
      .filter(item => range.intersectsNode(item))
      .forEach(item => {
        this.takeOffWrapper(item);
      });
  }

  private getTextNodes(container: Element, excludeTag?: string) {
    const result: Node[] = [];
    Array.from(container.childNodes).forEach(node => {
      if (node.nodeType === 3) {
        result.push(node);
      } else if (node.nodeType === 1) {
        if (!excludeTag) {
          result.push(...this.getTextNodes(node as HTMLElement));
        } else if ((node as HTMLElement).tagName.toLowerCase() !== excludeTag) {
          result.push(...this.getTextNodes(node as HTMLElement, excludeTag));
        }
      }
    });
    return result;
  }

  private takeOffWrapper(el: Element) {
    const fragment = this.doc.createDocumentFragment();
    Array.from(el.childNodes).forEach(item => {
      fragment.appendChild(item);
    });
    el.parentNode.replaceChild(fragment, el);
  }
}
