import { Component, parentFragmentAccessToken } from './component';

/**
 * 储存 Fragment 内容的类。
 */
export class Contents {
  /**
   * 当前内容的长度。
   */
  get length() {
    return this.elements.reduce((p, n) => p + n.length, 0);
  }

  /**
   * 当前内容。
   */
  private elements: Array<Component | string> = [];

  /**
   * 把新内容添加到 elements 末尾。
   * @param content 新内容
   */
  append(content: Component | string) {
    if (content === '') {
      return;
    }
    const lastChildIndex = this.elements.length - 1;
    const lastChild = this.elements[lastChildIndex];
    if (typeof lastChild === 'string' && typeof content === 'string') {
      this.elements[lastChildIndex] = lastChild + content;
    } else {
      this.elements.push(content);
    }
  }

  /**
   * 根据指定位置，切分出内容中的一部分。
   * @param startIndex
   * @param endIndex
   */
  slice(startIndex: number, endIndex = this.length) {
    if (startIndex >= endIndex) {
      return [];
    }
    let index = 0;
    const result: Array<string | Component> = [];
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
   * 查找一个节点在当前内容的中下标位置，如没有，则返回 -1。
   * @param element
   */
  indexOf(element: Component): number {
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
   * 在指定下标插入新的文本或节点。
   * @param content
   * @param index
   */
  insert(content: string | Component, index: number) {
    if (content === '') {
      return;
    }
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
        if ((el instanceof Component) && index === i) {
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
            if (content instanceof Component) {
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
   * 删除下标指定范围内的内容。
   * @param startIndex
   * @param endIndex
   */
  cut(startIndex: number, endIndex: number) {
    if (endIndex <= startIndex) {
      return [];
    }
    const discardedContents = this.slice(startIndex, endIndex);
    const elements = this.slice(0, startIndex).concat(this.slice(endIndex, this.length));
    this.elements = [];
    elements.forEach(item => this.append(item));
    return discardedContents.map(i => {
      if (i instanceof Component) {
        i[parentFragmentAccessToken] = null;
      }
      return i;
    });
  }

  /**
   * 通过下标获取文本或子节点。
   * @param index
   */
  getContentAtIndex(index: number) {
    return this.slice(index, index + 1)[0];
  }

  /**
   * 克隆当前内容，并返回一个完全一样的副本。
   */
  clone(): Contents {
    const newContents = new Contents();
    this.elements.forEach(item => {
      if (typeof item === 'string') {
        newContents.append(item)
      } else {
        const c = item.clone();
        c[parentFragmentAccessToken] = null;
        newContents.append(c);
      }
    });
    return newContents;
  }
}
