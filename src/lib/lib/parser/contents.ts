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
    const result: Sliceable[] = [];
    for (const el of this.elements) {
      const fragmentStartIndex = index;
      const fragmentEndIndex = index + el.length;
      index += el.length;
      if (startIndex >= fragmentStartIndex && endIndex <= fragmentEndIndex) {
        result.push(el.slice(Math.max(startIndex, fragmentStartIndex), Math.min(endIndex, fragmentEndIndex)));
        // if (el instanceof Contents) {
        //   const c = el.slice(Math.max(startIndex, fragmentStartIndex), Math.min(endIndex, fragmentEndIndex));
        //   result.push(...c);
        // } else {
        //   result.push(el.slice(Math.max(startIndex, fragmentStartIndex), Math.min(endIndex, fragmentEndIndex)));
        // }
      }
    }
    return result;
  }

  getContentAtIndex(index: number) {
    return this.slice(index, index + 1)[0];
  }
}
