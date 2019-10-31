export interface Sliceable {
  length: number;

  slice(startIndex: number, endIndex: number): Sliceable;
}

export class Contents implements Iterable<Sliceable> {
  get length() {
    return this.elements.reduce((p, n) => p + n.length, 0);
  }

  private elements: Array<Sliceable> = [];
  private forOfIndex = 0;

  [Symbol.iterator]() {
    return this;
  }

  next() {
    if (this.forOfIndex < this.elements.length) {
      const value = this.elements[this.forOfIndex];
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

  add(content: Sliceable) {
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
    const result = new Contents();
    for (const el of this.elements) {
      const fragmentStartIndex = index;
      const fragmentEndIndex = index + el.length;
      index += el.length;
      if (fragmentStartIndex >= startIndex && fragmentEndIndex <= endIndex) {
        result.add(el.slice(Math.max(startIndex, fragmentStartIndex), Math.min(fragmentEndIndex, endIndex)));
      }
    }
    return result;
  }
}
