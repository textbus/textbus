import { Template } from './template';

export class Contents {
  get length() {
    return this.elements.reduce((p, n) => p + n.length, 0);
  }
  private elements: Array<Template | string> = [];

  append(content: Template|string) {
    const lastChildIndex = this.elements.length - 1;
    const lastChild = this.elements[lastChildIndex];
    if (typeof lastChild === 'string' && typeof content === 'string') {
      this.elements[lastChildIndex] = lastChild + content;
    } else {
      this.elements.push(content);
    }
  }

  slice(startIndex: number, endIndex = this.length) {
    if (startIndex >= endIndex) {
      return [];
    }
    let index = 0;
    const result: Array<string | Template> = [];
    for (const el of this.elements) {
      const fragmentStartIndex = index;
      const fragmentEndIndex = index + el.length;
      index += el.length;

      if (startIndex < fragmentEndIndex && endIndex > fragmentStartIndex) {
        if (typeof el === 'string') {
          const min = Math.max(0, startIndex - fragmentStartIndex);
          const max = Math.min(fragmentEndIndex, endIndex) - fragmentStartIndex;
          result.push(el.slice(min, max));
        } else {
          result.push(el);
        }
      }

    }
    return result;
  }

  /**
   * 查找一个节点在当前内容的中下标位置，如没有，则返回 -1
   * @param element
   */
  find(element: Template): number {
    let index = 0;
    for (const item of this.elements) {
      if (item === element) {
        return index;
      }
      index += item.length;
    }
    return -1;
  }
}
