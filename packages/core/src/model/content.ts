import { Component, ComponentLiteral } from './component'

let firstRun = true

/**
 * Textbus 内容管理类
 * Content 属于 Slot 的私有属性，在实际场景中，开发者不需在关注此类，也不需要访问或操作此类
 */
export class Content {
  private static get segmenter() {
    if (Content._segmenter) {
      return Content._segmenter
    }
    if (Intl?.Segmenter) {
      Content._segmenter = new Intl.Segmenter()
      return Content._segmenter
    }
    if (firstRun) {
      console.warn('[Textbus: warning]: cannot found `Intl.Segmenter`, slot index will revert back to default mode.')
      firstRun = false
    }
    return null
  }

  static _segmenter: Intl.Segmenter | null = null
  private data: Array<string | Component> = []

  /**
   * 内容的长度
   */
  get length() {
    return this.data.reduce((p, n) => p + n.length, 0)
  }

  /**
   * 修复 index，由于 emoji 长度不固定，当 index 在 emoji 中时，操作数据会产生意外的数据
   * @param index 当前的 index
   * @param toEnd 当需要变更 index 时，是向后还是向前移动
   */
  correctIndex(index: number, toEnd: boolean) {
    if (index <= 0 || index >= this.length || !Content.segmenter) {
      return index
    }
    let i = 0
    for (const item of this.data) {
      const itemLength = item.length
      if (typeof item === 'string') {
        if (index > i && index < i + itemLength) {
          const segments = Content.segmenter.segment(item)
          let offsetIndex = 0

          for (const item of segments) {
            const length = item.segment.length
            const nextOffset = offsetIndex + length
            if (nextOffset === index) {
              return index
            }
            if (nextOffset > index) {
              if (toEnd) {
                return nextOffset + i
              }
              return offsetIndex + i
            }
            offsetIndex = nextOffset
          }

          return index
        }
      }
      i += itemLength
      if (i >= index) {
        break
      }
    }
    return index
  }

  /**
   * 在指定下标位置插入内容
   * @param index
   * @param content
   */
  insert(index: number, content: string | Component) {
    if (index >= this.length) {
      this.append(content)
    } else {
      let i = 0 // 当前内容下标
      let ii = 0 // 当前数组元素下标
      for (const el of this.data) {
        if (index >= i) {
          if (typeof el === 'string') {
            if (index >= i && index < i + el.length) {
              const cc = [el.slice(0, index - i), content, el.slice(index - i)].filter(i => i)
              if (typeof content === 'string') {
                this.data.splice(ii, 1, cc.join(''))
              } else {
                this.data.splice(ii, 1, ...cc)
              }
              break
            }
          } else if (index === i) {
            const prev = this.data[ii - 1]
            if (typeof prev === 'string' && typeof content === 'string') {
              this.data[ii - 1] = prev + content
            } else if (i === 0) {
              this.data.unshift(content)
            } else {
              this.data.splice(ii, 0, content)
            }
            break
          }
        }
        ii++
        i += el.length
      }
    }
  }

  /**
   * 把内容添加到最后
   * @param content
   */
  append(content: Component | string) {
    const lastChildIndex = this.data.length - 1
    const lastChild = this.data[lastChildIndex]
    if (typeof lastChild === 'string' && typeof content === 'string') {
      this.data[lastChildIndex] = lastChild + content
    } else {
      this.data.push(content)
    }
  }

  cut(startIndex = 0, endIndex = this.length): Array<string | Component> {
    if (endIndex <= startIndex) {
      return []
    }
    const discardedContents = this.slice(startIndex, endIndex)
    const elements = this.slice(0, startIndex).concat(this.slice(endIndex, this.length))
    this.data = []
    elements.forEach(item => this.append(item))
    return discardedContents
  }

  slice(startIndex = 0, endIndex = this.length): Array<string | Component> {
    if (startIndex >= endIndex) {
      return []
    }
    startIndex = this.correctIndex(startIndex, false)
    endIndex = this.correctIndex(endIndex, true)
    let index = 0
    const result: Array<string | Component> = []
    for (const el of this.data) {
      const fragmentStartIndex = index
      const len = el.length
      const fragmentEndIndex = index + len
      index += len

      if (startIndex < fragmentEndIndex && endIndex > fragmentStartIndex) {
        if (typeof el === 'string') {
          const min = Math.max(0, startIndex - fragmentStartIndex)
          const max = Math.min(fragmentEndIndex, endIndex) - fragmentStartIndex
          result.push(el.slice(min, max))
        } else {
          result.push(el)
        }
      }

    }
    return result
  }

  toJSON(): Array<string | ComponentLiteral> {
    return this.data.map(i => {
      if (typeof i === 'string') {
        return i
      }
      return i.toJSON()
    })
  }

  indexOf(element: Component): number {
    let index = 0
    for (const item of this.data) {
      if (item === element) {
        return index
      }
      index += item.length
    }
    return -1
  }

  getContentAtIndex(index: number) {
    return this.slice(index, index + 1)[0]
  }

  toGrid() {
    const splitPoints = [0]
    let index = 0
    this.data.forEach(i => {
      index += i.length
      splitPoints.push(index)
    })
    return [...splitPoints]
  }

  toString() {
    return this.data.map(i => {
      if (typeof i === 'string') {
        return i
      }
      return i.toString()
    }).join('')
  }
}
