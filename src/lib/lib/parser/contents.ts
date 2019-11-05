import { ViewNode } from './view-node';

export class Contents implements Iterable<string | ViewNode> {
  get length() {
    return this.elements.reduce((p, n) => p + n.length, 0);
  }

  private elements: Array<string | ViewNode> = [];
  private forOfIndex = 0;

  [Symbol.iterator]() {
    return this;
  }

  next() {
    if (this.forOfIndex < this.length) {
      const value = this.getContentAtIndex(this.forOfIndex);
      this.forOfIndex++;
      return {
        done: false,
        value
      };
    }
    this.forOfIndex = 0;
    return {
      done: true,
      value: undefined
    };
  }

  add(content: string | ViewNode) {
    const lastChildIndex = this.elements.length - 1;
    const lastChild = this.elements[lastChildIndex];
    if (typeof lastChild === 'string' && typeof content === 'string') {
      this.elements[lastChildIndex] = lastChild + content;
    } else {
      this.elements.push(content);
    }
  }

  slice(startIndex: number, endIndex = this.length) {
    let index = 0;
    const result: Array<string | ViewNode> = [];
    for (const el of this.elements) {
      const fragmentStartIndex = index;
      const fragmentEndIndex = index + el.length;
      index += el.length;
      if (startIndex >= fragmentStartIndex) {
        if (endIndex <= fragmentEndIndex) {
          if (typeof el === 'string') {
            result.push(el.slice(Math.max(startIndex, fragmentStartIndex), Math.min(endIndex, fragmentEndIndex)));
          } else {
            result.push(el);
          }
        } else {
          break;
        }
      }
    }
    return result;
  }

  getContentAtIndex(index: number) {
    return this.slice(index, index + 1)[0];
  }
}
