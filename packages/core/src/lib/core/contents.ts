import { AbstractComponent, parentFragmentAccessToken } from './component';

/**
 * 用数组储存 Fragment 内容的类，数组元素类型为 AbstractComponent 或 string。
 * 并提供对内容进行添加，查找，复制等功能。
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
  private elements: Array<AbstractComponent | string> = [];

  /**
   * 把新内容添加到 elements 末尾。
   * @param content 新内容
   */
  append(content: AbstractComponent | string) {
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
   * 根据指定位置，切分出内容中的一部分。如果切分区间与数组中的字符串元素有部分交集，
   * 则只取出相交的部分，如果是与组件有交集，则取出整个组件。
   * @param startIndex
   * @param endIndex
   */
  slice(startIndex: number, endIndex = this.length): Array<string | AbstractComponent> {
    if (startIndex >= endIndex) {
      return [];
    }
    let index = 0;
    const result: Array<string | AbstractComponent> = [];
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
  indexOf(element: AbstractComponent): number {
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
   * @param index 要插入的目标位置
   */
  insert(content: string | AbstractComponent, index: number) {
    if (content === '') {
      return;
    }
    if (index >= this.length) {
      this.append(content);
      return;
    }
    let i = 0;  // 当前内容下标
    let ii = 0; // 当前数组元素下标
    for (const el of this.elements) {
      if (index >= i) {
        if ((el instanceof AbstractComponent) && index === i) {
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
            if (content instanceof AbstractComponent) {
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
  cut(startIndex: number, endIndex: number): Array<string | AbstractComponent> {
    if (endIndex <= startIndex) {
      return [];
    }
    const discardedContents = this.slice(startIndex, endIndex);
    const elements = this.slice(0, startIndex).concat(this.slice(endIndex, this.length));
    this.elements = [];
    elements.forEach(item => this.append(item));
    return discardedContents.map(i => {
      if (i instanceof AbstractComponent) {
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
