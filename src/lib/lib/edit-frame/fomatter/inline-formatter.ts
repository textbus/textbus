import { Formatter } from './formatter';
import { MatchStatus } from '../../matcher';
import { TBRange } from '../../range';
import { EditFrame } from '../edit-frame';
import { matchContainerByTagName, takeOffWrapper } from '../utils';

export class InlineFormatter implements Formatter {
  private document: Document;

  constructor(private tagName: string) {
  }

  format(range: TBRange, frame: EditFrame, matchStatus: MatchStatus) {
    this.document = frame.contentDocument;
    const tag = this.tagName;

    if (matchStatus.inContainer) {
      if (range.rawRange.collapsed) {
        return;
      }
      const {before, after} = range.getRangesAfterAndBeforeWithinContainer(matchStatus.container as HTMLElement);

      this.wrap(before, tag);
      this.wrap(after, tag);
      takeOffWrapper(this.document, matchStatus.container as HTMLElement);
      before.detach();
      after.detach();
      range.removeMarkRange();
    } else {
      if (range.commonAncestorContainer.nodeType === 3) {
        const newWrap = this.document.createElement(tag);
        const isCollapsed = range.rawRange.collapsed;
        range.rawRange.surroundContents(newWrap);
        if (isCollapsed) {
          newWrap.innerHTML = '&#8203;';
          range.rawRange.selectNodeContents(newWrap);
        }
      } else if (range.commonAncestorContainer.nodeType === 1) {
        range.markRange();
        const current = range.rawRange;

        if (matchStatus.matchAllChild) {
          this.unWrap(current, tag);
        } else {
          this.unWrap(current, tag);
          range.apply();
          this.wrap(current, tag);
        }
        range.removeMarkRange();
      }
    }
  }

  private wrap(range: Range, tag: string) {
    this.getTextNodes(range.commonAncestorContainer as Element).filter(item => {
      if (!item.textContent) {
        item.parentNode.removeChild(item);
        return false;
      }
      return range.intersectsNode(item);
    }).forEach(item => {
      const wrap = this.document.createElement(tag);
      item.parentNode.replaceChild(wrap, item);
      wrap.appendChild(item);
    });
  }

  private unWrap(range: Range, tag: string) {
    const start = matchContainerByTagName(range.startContainer, tag, range.commonAncestorContainer);
    const end = matchContainerByTagName(range.endContainer, tag, range.commonAncestorContainer);

    if (start) {
      const startRange = this.document.createRange();
      startRange.setStartBefore(start);
      startRange.setEnd(range.startContainer, range.startOffset);
      start.parentNode.insertBefore(startRange.extractContents(), start);
    }
    if (end) {
      const endRange = this.document.createRange();
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
        takeOffWrapper(this.document, item);
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
}
