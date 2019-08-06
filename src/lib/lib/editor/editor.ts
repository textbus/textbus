import { Subject, merge, fromEvent, Observable } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';

import { template } from './template-html';
import { dtd } from './dtd';

export class Editor {
  readonly host = document.createElement('iframe');
  readonly onSelectionChange: Observable<Selection>;
  readonly onLoad: Observable<this>;
  readonly contentDocument: Document;
  readonly contentWindow: Window;
  private selectionChangeEvent = new Subject<Selection>();
  private loadEvent = new Subject<this>();
  private editorHTML = template;
  private selection: Selection;

  constructor() {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.onLoad = this.loadEvent.asObservable();
    this.host.classList.add('tanbo-editor');

    this.host.src = `javascript:void((function () {
                      document.open();
                      document.domain = '${document.domain}';
                      document.write('${this.editorHTML}');
                      document.close();
                    })())`;
    const self = this;
    this.host.onload = () => {
      self.setup(self.host.contentDocument);
      (<any>self).contentDocument = self.host.contentDocument;
      (<any>self).contentWindow = self.host.contentWindow;
      this.contentDocument.body.focus();
      this.selection = this.contentDocument.getSelection();
      this.selectionChangeEvent.next(this.selection);
      this.loadEvent.next(this);
    }
  }

  format(tag: string) {
    tag = tag.toLowerCase();
    if (dtd[tag].type === 'single') {
      return;
    }
    if (dtd[tag].display === 'inline') {
      this.inlineElementFormat(tag);
    }
  }

  /**
   * 在文档选中某一个元素节点
   * @param node
   */
  updateSelectionByElement(node: Element) {
    const selection = this.contentDocument.getSelection();
    selection.removeAllRanges();
    const range = this.contentDocument.createRange();
    range.selectNode(node);
    selection.addRange(range);
  }

  private inlineElementFormat(tag: string) {
    const selection = this.selection;
    const range = selection.getRangeAt(0);

    const parentTagContainer = this.matchContainerByTagName(range.commonAncestorContainer as HTMLElement, tag);

    if (parentTagContainer) {
      console.log(1)
      const ranges = this.splitBySelectedRange(range, parentTagContainer);
      const {startContainer, endContainer, startOffset, endOffset} = ranges.current;
      this.wrap(ranges.before, tag);
      this.unWrap(ranges.current, tag);
      this.wrap(ranges.after, tag);
      this.takeOffWrapper(parentTagContainer);
      ranges.before.detach();
      ranges.after.detach();

      ranges.current.setStart(startContainer, startOffset);
      ranges.current.setEnd(endContainer, endOffset);
    } else {
      if (range.commonAncestorContainer.nodeType === 3) {
        console.log(2)
        const newWrap = document.createElement(tag);
        const isCollapsed = range.collapsed;
        range.surroundContents(newWrap);
        if (isCollapsed) {
          newWrap.innerHTML = '&#8203;';
          range.selectNodeContents(newWrap);
        }
      } else if (range.commonAncestorContainer.nodeType === 1) {
        console.log(3)
        const {before, current, after} = this.splitBySelectedRange(range, range.commonAncestorContainer as Element);
        if (this.hasOtherTag(current.commonAncestorContainer as HTMLElement, current, tag)) {
          this.unWrap(current, tag);
          this.wrap(current, tag);
          console.log(4)
        } else {
          console.log(5)
          this.unWrap(current, tag);
          console.log(current);
        }
        before.detach();
        after.detach();
      }
    }
    this.contentDocument.body.focus();
  }

  private splitBySelectedRange(range: Range, scope: Element): { before: Range, current: Range, after: Range } {
    const beforeRange = this.contentDocument.createRange();
    const afterRange = this.contentDocument.createRange();

    if (range.startContainer.nodeType === 3) {
      const startParent = range.startContainer.parentNode;
      beforeRange.setStart(range.startContainer, 0);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      startParent.insertBefore(beforeRange.extractContents(), range.startContainer);
      beforeRange.setStartBefore(scope);
      beforeRange.setEndBefore(range.startContainer);
    } else if (range.startContainer.nodeType === 1) {
      beforeRange.setStartBefore(scope);
      beforeRange.setEndBefore(range.startContainer);
    }

    if (range.endContainer.nodeType === 3) {
      const endParent = range.endContainer.parentNode;
      afterRange.setStart(range.endContainer, range.endOffset);
      afterRange.setEndAfter(range.endContainer);
      endParent.appendChild(afterRange.extractContents());
      afterRange.setStartAfter(range.endContainer);
      afterRange.setEndAfter(scope);
    } else if (range.endContainer.nodeType === 1) {
      afterRange.setEndAfter(range.endContainer);
      afterRange.setEndAfter(scope);
    }
    return {
      before: beforeRange,
      current: range,
      after: afterRange
    };
  }

  private wrap(range: Range, tag: string) {
    this.getTextNodes(range.commonAncestorContainer as Element).filter(item => {
      return range.intersectsNode(item);
    }).forEach(item => {
      const wrap = document.createElement(tag);
      item.parentNode.replaceChild(wrap, item);
      wrap.appendChild(item);
      if (!range.intersectsNode(wrap)) {
        range.setStartBefore(wrap);
      }
    });
  }

  private unWrap(range: Range, tag: string) {
    const container = range.commonAncestorContainer.nodeType === 1 ?
      range.commonAncestorContainer : range.commonAncestorContainer.parentNode;
    Array.from((container as HTMLElement).getElementsByTagName(tag))
      .filter(item => range.intersectsNode(item))
      .forEach(item => {
        const {lastChild} = this.takeOffWrapper(item);
        console.log(range.cloneContents())
        console.log(lastChild, this.selection.focusNode);
        if (!range.intersectsNode(lastChild)) {
          console.log(545432);
          range.setEnd(lastChild, lastChild.textContent.length);

        }
        console.log(range.cloneContents(), this.selection.focusNode);
      });
  }

  private normalize(el: Element) {
    const elements = Array.from(el.childNodes);
    for (let i = 0; i < elements.length; i++) {
      const node = elements[i];
      for (let j = i + 1; j < elements.length; j++) {
        const next = elements[j];
        if (next) {
          break;
        }
        if (node.nodeType === 3 && next.nodeType === 3) {
          node.textContent = node.textContent + next.textContent;
          el.removeChild(next);
          i++;
        } else if (node.nodeType === 1 && next.nodeType === 1 &&
          (node as Element).tagName === (next as Element).tagName) {
          Array.from(next.childNodes).forEach(item => node.appendChild(item));
          el.removeChild(next);
          i++;
        }
      }
      if (node.nodeType === 1) {
        this.normalize(node as HTMLElement);
      }
    }
  }

  private getTextNodes(container: Element) {
    const result: Node[] = [];
    Array.from(container.childNodes).forEach(node => {
      if (node.nodeType === 3) {
        result.push(node);
      } else if (node.nodeType === 1) {
        result.push(...this.getTextNodes(node as HTMLElement));
      }
    });
    return result;
  }

  private hasOtherTag(container: HTMLElement, range: Range, tag: string): boolean {
    for (const node of Array.from(container.childNodes)) {
      if (!range.intersectsNode(node)) {
        continue;
      }
      if (node.nodeType === 3 && node.textContent !== '') {
        return true;
      }
      if (node.nodeType === 1) {
        if ((node as HTMLElement).tagName.toLowerCase() !== tag) {
          return this.hasOtherTag(node as HTMLElement, range, tag);
        }
      }
    }
    return false;
  }

  private matchContainerByTagName(node: HTMLElement, tagName: string) {
    while (node) {
      if (node.nodeType === 1 && node.tagName.toLowerCase() === tagName) {
        return node;
      }
      node = node.parentNode as HTMLElement;
    }
    return null;
  }

  private takeOffWrapper(el: Element): { firstChild: Node, lastChild: Node } {
    const fragment = document.createDocumentFragment();
    const childNodes = Array.from(el.childNodes);
    childNodes.forEach(item => {
      fragment.appendChild(item);
    });
    el.parentNode.replaceChild(fragment, el);
    return {
      firstChild: childNodes[0],
      lastChild: childNodes[childNodes.length - 1]
    };
  }

  private setup(childDocument: Document) {
    const childBody = childDocument.body;
    merge(...[
      'click',
      'contextmenu',
      'mousedown',
      'keydown',
      'keyup',
      'keypress',
      'mouseup',
      'selectstart'
    ].map(type => fromEvent(childBody, type))).pipe(debounceTime(100), throttleTime(100)).subscribe(() => {
      this.selectionChangeEvent.next(this.contentWindow.getSelection());
    });
  }
}
