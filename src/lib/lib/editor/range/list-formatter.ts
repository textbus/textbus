import { EditorFormatter } from './range';
import { dtd } from '../dtd';

export class ListFormatter extends EditorFormatter {
  private rawTagKey = '__tanbo_editor_raw_tag__';

  format(tag: string) {
    const selection = this.selection;
    const range = selection.getRangeAt(0);

    const parentTagContainer = this.matchContainerByTagName(
      range.commonAncestorContainer as HTMLElement,
      tag,
      this.doc.body) as HTMLElement;
    if (parentTagContainer) {
      console.log('b1');
      const cacheMark = this.splitBySelectedRange(range, range.commonAncestorContainer);
      const parent = parentTagContainer.parentNode;
      const block = this.findBlockContainer(range.commonAncestorContainer as HTMLElement, parentTagContainer);
      const containerRange = this.doc.createRange();
      const nextSibling = parentTagContainer.nextSibling;
      const rawTag = parentTagContainer[this.rawTagKey];
      if (parentTagContainer === block) {
        containerRange.selectNodeContents(block);
      } else {
        containerRange.selectNode(block);
      }

      const {before, current, after, startMark, endMark} = this.splitBySelectedRange(containerRange, parentTagContainer);

      const beforeContents = before.extractContents();
      const afterContents = after.extractContents();

      if (nextSibling) {
        if (beforeContents.textContent) {
          parent.insertBefore(beforeContents, nextSibling);
        }
        if (rawTag) {
          const wrapper = this.doc.createElement(rawTag);
          wrapper.appendChild(current.extractContents());
          parent.insertBefore(wrapper, nextSibling);
        } else {
          parent.insertBefore(current.extractContents(), nextSibling);
        }
        if (afterContents.textContent) {
          parent.insertBefore(afterContents, nextSibling);
        }
      } else {
        if (beforeContents.textContent) {
          parent.appendChild(beforeContents);
        }
        if (rawTag) {
          const wrapper = this.doc.createElement(rawTag);
          wrapper.appendChild(current.extractContents());
          parent.insertBefore(wrapper, nextSibling);
        } else {
          parent.insertBefore(current.extractContents(), nextSibling);
        }
        if (afterContents.textContent) {
          parent.appendChild(afterContents);
        }
      }
      const s = this.findEmptyContainer(cacheMark.startMark);
      const e = this.findEmptyContainer(cacheMark.endMark);
      range.setStartAfter(s);
      range.setEndBefore(e);
      s.parentNode.removeChild(s);
      e.parentNode.removeChild(e);
      const ss = this.findEmptyContainer(startMark);
      const ee = this.findEmptyContainer(endMark);
      ss.parentNode.removeChild(ss);
      ee.parentNode.removeChild(ee);
    } else {

      console.log('b2');
      const {startMark, current, endMark} = this.splitBySelectedRange(range, range.commonAncestorContainer);
      const containerRange = this.doc.createRange();
      const container = this.findBlockContainer(range.commonAncestorContainer, this.doc.body);
      containerRange.selectNodeContents(container);
      const newContainer = this.createContainer(tag);
      newContainer.wrapper[this.rawTagKey] = (container as HTMLElement).tagName;
      container.parentNode.insertBefore(newContainer.wrapper, container);
      newContainer.container.appendChild(container);
      // containerRange.surroundContents(newContainer.container);
      // container.parentNode.replaceChild(newContainer.wrapper, container);

      const s = this.findEmptyContainer(startMark);
      const e = this.findEmptyContainer(endMark);
      current.setStartAfter(s);
      current.setEndBefore(e);
      s.parentNode.removeChild(s);
      e.parentNode.removeChild(e);
    }
  }


  private findBlockContainer(node: Node, scope: HTMLElement): Node {
    if (node === scope) {
      return node;
    }

    if (node.nodeType === 3) {
      return this.findBlockContainer(node.parentNode, scope);
    }
    if (node.nodeType === 1) {
      const tagName = (node as HTMLElement).tagName.toLowerCase();
      if (dtd[tagName].display === 'block') {
        return node;
      }
      if (node.parentNode) {
        return this.findBlockContainer(node.parentNode, scope);
      }
    }
    return scope;
  }
}
