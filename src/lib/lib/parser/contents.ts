import { ViewData } from './view-data';
import { Fragment } from './fragment';

export class Contents implements Iterable<string | ViewData> {
  get length() {
    return this.elements.reduce((p, n) => p + n.length, 0);
  }

  private elements: Array<string | ViewData> = [];
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

  /**
   * 在指定下标插入新的文本或节点
   * @param content
   * @param index
   */
  insert(content: string | ViewData, index: number) {
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
        if (el instanceof ViewData && index === i) {
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
            if (content instanceof ViewData) {
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

  /**
   * 在内容最后添加文本或节点
   * @param content
   */
  append(content: string | ViewData) {
    const lastChildIndex = this.elements.length - 1;
    const lastChild = this.elements[lastChildIndex];
    if (typeof lastChild === 'string' && typeof content === 'string') {
      this.elements[lastChildIndex] = lastChild + content;
    } else {
      this.elements.push(content);
    }
  }

  /**
   * 在当前数据中，根据传入的下标范围切出片段并返回一个数组
   * @param startIndex
   * @param endIndex
   */
  slice(startIndex: number, endIndex = this.length) {
    if (startIndex >= endIndex) {
      return [];
    }
    let index = 0;
    const result: Array<string | ViewData> = [];
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
   * 删除下标指定范围内的内容
   * @param startIndex
   * @param endIndex
   */
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

  /**
   * 在指定下标位置插入一组文本或节点
   * @param contents
   * @param index
   */
  insertElements(contents: Array<string | ViewData>, index: number) {
    contents.forEach(item => {
      this.insert(item, index);
      index += item.length;
    });
  }

  /**
   * 获取当前内容内所有的子片段
   */
  getFragments(): Fragment[] {
    return this.elements.filter(i => i instanceof Fragment) as Fragment[];
  }

  /**
   * 查找一个节点在当前内容的中下标位置，如没有，则返回 -1
   * @param element
   */
  find(element: ViewData): number {
    let index = 0;
    for (const item of this.elements) {
      if (item === element) {
        return index;
      }
      index += item.length;
    }
    return -1;
  }

  /**
   * 通过下标获取文本或子节点
   * @param index
   */
  getContentAtIndex(index: number) {
    return this.slice(index, index + 1)[0];
  }

  /**
   * 复制当前内容的副本
   */
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

  /**
   * 清除内容
   */
  clear() {
    this.elements = [];
  }
}
