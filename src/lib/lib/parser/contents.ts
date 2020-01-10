import { View } from './view';
import { Fragment } from './fragment';

export class Contents implements Iterable<string | View> {
  get length() {
    return this.elements.reduce((p, n) => p + n.length, 0);
  }

  private elements: Array<string | View> = [];
  private forOfIndex = 0;

  [Symbol.iterator]() {
    this.forOfIndex = 0;
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
    return {
      done: true,
      value: undefined
    };
  }

  insert(content: string | View, index: number) {
    if (index >= this.length) {
      if (typeof content === 'string') {
        const last = this.elements[this.elements.length - 1];
        if (typeof last === 'string') {
          this.elements[this.elements.length - 1] = last + content;
          return;
        }
      }
      this.elements.push(content);
      return;
    }
    let i = 0;
    let ii = 0;
    for (const el of this.elements) {
      if (index >= i) {
        if (i > index) {
          break;
        }
        if (el instanceof View && index === i) {
          const prev = this.elements[ii - 1];
          if (typeof prev === 'string' && typeof content === 'string') {
            this.elements[ii - 1] = prev + content;
          } else {
            if (i === 0) {
              this.elements.unshift(content);
            } else {
              this.elements.splice(ii, 0, content);
            }
          }
          break;
        } else if (typeof el === 'string') {
          if (index >= i && index < i + el.length) {
            const cc = [el.slice(0, index - i), content, el.slice(index - i)].filter(i => i);
            if (content instanceof View) {
              this.elements.splice(ii, 1, ...cc);
            } else {
              this.elements.splice(ii, 1, cc.join(''));
            }
            break;
          }
        }
      }
      ii++;
      i += el.length;
    }
  }

  append(content: string | View) {
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
    const result: Array<string | View> = [];
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

  delete(startIndex: number, endIndex: number) {
    if (endIndex <= startIndex) {
      return [];
    }
    const discardedContents = this.slice(startIndex, endIndex);
    const elements = this.slice(0, startIndex).concat(this.slice(endIndex, this.length));
    this.elements = [];
    elements.forEach(item => this.append(item));
    return discardedContents;
  }

  insertElements(contents: Array<string | View>, index: number) {
    contents.forEach(item => {
      this.insert(item, index);
      index += item.length;
    });
  }

  getFragments(): Fragment[] {
    return this.elements.filter(i => i instanceof Fragment) as Fragment[];
  }

  find(element: View): number {
    let index = 0;
    for (const item of this.elements) {
      if (item === element) {
        return index;
      }
      index += item.length;
    }
    return -1;
  }

  getContentAtIndex(index: number) {
    return this.slice(index, index + 1)[0];
  }

  clone(): Contents {
    const newContents = new Contents();
    this.elements.forEach(item => {
      if (typeof item === 'string') {
        newContents.append(item);
      } else {
        newContents.append(item.clone());
      }
    });
    return newContents;
  }
}
