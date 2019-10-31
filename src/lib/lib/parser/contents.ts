export interface Length {
  length: number;
}

export class Contents<T extends Length> implements Iterable<T> {
  get length() {
    return this.elements.reduce((p, n) => p + n.length, 0);
  }

  private elements: Array<T> = [];
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

  add(content: T) {
    const lastChildIndex = this.elements.length - 1;
    const lastChild = this.elements[lastChildIndex];
    if (typeof lastChild === 'string' && typeof content === 'string') {
      this.elements[lastChildIndex] = (lastChild + content) as any;
    } else {
      this.elements.push(content);
    }
  }

  slice(startIndex: number, offset?: number) {

  }
}
