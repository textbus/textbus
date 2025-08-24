import { Formatter } from './attribute'
import { Slot } from './slot'

/**
 * 格式或属性的值，必须为可被 JSON 序列化的字面量
 */
export type FormatValue = any

/**
 * 一组格式
 */
export type Formats = [formatter: Formatter<any>, value: FormatValue][]

/**
 * 标识格式的范围
 */
export interface FormatRange<T = FormatValue> {
  startIndex: number
  endIndex: number
  value: T
}

/**
 * 格式的字面量
 */
export interface FormatLiteral<T = FormatValue> {
  [key: string]: FormatRange<T>[]
}

/**
 * 格式的详情
 */
export interface FormatItem<T = FormatValue> extends FormatRange<T> {
  formatter: Formatter<T>
}

/**
 * 格式树
 */
export interface FormatTree<T = FormatValue> {
  startIndex: number
  endIndex: number
  children?: FormatTree<T>[]
  formats?: FormatItem<T>[]
}

function isVoid(data: any) {
  return data === null || typeof data === 'undefined'
}

/**
 * Textbus 格式管理类
 * Format 类为 Slot 的私有属性，在实际场景中，开发者不需在关注此类，也不需要访问或操作此类
 */
export class Format {
  private map = new Map<Formatter<any>, FormatRange<any>[]>()

  constructor(private slot: Slot) {
  }

  /**
   * 将新样式合并到现有样式中
   * @param formatter
   * @param value
   * @param background
   */
  merge<T extends FormatValue>(formatter: Formatter<T>, value: FormatRange<T>, background = false): this {
    let ranges = this.map.get(formatter)
    if (!ranges) {
      const v = value.value
      if (isVoid(v)) {
        return this
      }
      ranges = [value]
      this.map.set(formatter, ranges)
      return this
    }

    const newRanges = this.normalizeFormatRange(background, ranges, value)
    if (newRanges.length) {
      this.map.set(formatter, newRanges)
    } else {
      this.map.delete(formatter)
    }
    return this
  }

  /**
   * 将 index 后的样式起始和结束位置均增加 count 大小
   * @param index
   * @param count
   */
  stretch(index: number, count: number) {
    this.map.forEach(values => {
      values.forEach(range => {
        if (range.endIndex < index) {
          return
        }
        range.endIndex += count
        if (range.startIndex >= index) {
          range.startIndex += count
        }
      })
    })
    return this
  }

  /**
   * 将指定 index 位置后的样式向后平移 distance 长度
   * @param index
   * @param distance
   */
  split(index: number, distance: number) {
    Array.from(this.map).forEach(([key, formatRanges]) => {
      const newRanges: FormatRange[] = []
      formatRanges.forEach(range => {
        if (range.endIndex <= index) {
          newRanges.push({ ...range })
          return
        }
        if (range.startIndex >= index) {
          newRanges.push({
            startIndex: range.startIndex + distance,
            endIndex: range.endIndex + distance,
            value: range.value
          })
          return
        }

        newRanges.push({
          startIndex: range.startIndex,
          endIndex: index,
          value: range.value
        }, {
          startIndex: index + distance,
          endIndex: distance + range.endIndex,
          value: range.value
        })
      })
      // console.log([key, formatRanges, JSON.parse(JSON.stringify(newRanges)), index, distance])
      this.map.set(key, newRanges)
    })
    return this
  }

  /**
   * 从指定 index 位置的样式删除 count
   * @param startIndex
   * @param count
   */
  shrink(startIndex: number, count: number) {
    this.map.forEach(values => {
      values.forEach(range => {
        if (range.endIndex <= startIndex) {
          return
        }
        range.endIndex = Math.max(startIndex, range.endIndex - count)
        if (range.startIndex > startIndex) {
          range.startIndex = Math.max(startIndex, range.startIndex - count)
        }
      })
    })
    Array.from(this.map.keys()).forEach(key => {
      const oldRanges = this.map.get(key)!
      const newRanges = this.normalizeFormatRange(false, oldRanges)
      if (newRanges.length) {
        this.map.set(key, newRanges)
      } else {
        this.map.delete(key)
      }
    })
    return this
  }

  /**
   * 提取指定范围内的样式
   * @param startIndex
   * @param endIndex
   * @param formatter
   */
  extract(startIndex: number, endIndex: number, formatter?: Formatter[]): Format {
    const format = new Format(this.slot)
    this.map.forEach((ranges, key) => {
      if (formatter && !formatter.includes(key)) {
        return
      }
      const extractRanges = this.extractFormatRangesByFormatter(startIndex, endIndex, key)
      if (extractRanges.length) {
        format.map.set(key, extractRanges)
      }
    })
    return format
  }

  /**
   * 生成一个重置位置的 format
   * @param slot
   * @param startIndex
   * @param endIndex
   */
  createFormatByRange(slot: Slot, startIndex: number, endIndex: number) {
    const format = new Format(slot)
    this.map.forEach((ranges, key) => {
      const extractRanges = this.extractFormatRangesByFormatter(startIndex, endIndex, key)
      if (extractRanges.length) {
        format.map.set(key, extractRanges.map(i => {
          i.startIndex -= startIndex
          i.endIndex -= startIndex
          return i
        }))
      }
    })
    return format
  }

  /**
   * 通过 formatter 提取指定范围内的样式数据
   * @param startIndex
   * @param endIndex
   * @param formatter
   */
  extractFormatRangesByFormatter(startIndex: number, endIndex: number, formatter: Formatter<any>) {
    const extractRanges: FormatRange<any>[] = []

    const ranges = this.map.get(formatter) || []
    ranges.forEach(range => {
      if (range.startIndex > endIndex || range.endIndex < startIndex) {
        return
      }
      const s = Math.max(range.startIndex, startIndex)
      const n = Math.min(range.endIndex, endIndex)
      if (s < n) {
        extractRanges.push({
          startIndex: s,
          endIndex: n,
          value: range.value
        })
      }
    })
    return extractRanges
  }

  /**
   * 丢弃指定范围内的样式
   * @param formatter
   * @param startIndex
   * @param endIndex
   */
  discard(formatter: Formatter<any>, startIndex: number, endIndex: number) {
    const oldRanges = this.map.get(formatter)
    if (oldRanges) {
      this.normalizeFormatRange(false, oldRanges, {
        startIndex,
        endIndex,
        value: null as any
      })
    }
    return this
  }

  extractFormatsByIndex(index: number) {
    const formats: Formats = []
    if (index === 0) {
      this.map.forEach((ranges, formatter) => {
        ranges.forEach(i => {
          if (i.startIndex === 0) {
            formats.push([
              formatter,
              i.value
            ])
          }
        })
      })
    } else {
      this.map.forEach((ranges, formatter) => {
        ranges.forEach(i => {
          if (i.startIndex < index && i.endIndex >= index) {
            formats.push([
              formatter,
              i.value
            ])
          }
        })
      })
    }
    return formats
  }

  toGrid() {
    const splitPoints = new Set<number>()
    splitPoints.add(0)
    splitPoints.add(this.slot.length)
    this.map.forEach(ranges => {
      ranges.forEach(item => {
        splitPoints.add(item.startIndex)
        splitPoints.add(item.endIndex)
      })
    })
    return [...splitPoints].sort((a, b) => a - b)
  }

  toJSON() {
    const json: FormatLiteral<any> = {}
    this.map.forEach((value, formatter) => {
      json[formatter.name] = value.map(i => ({ ...i }))
    })
    return json
  }

  toTree(startIndex: number, endIndex: number): FormatTree<any> {
    const copyFormat = this.extract(startIndex, endIndex)
    const tree: FormatTree<any> = {
      startIndex,
      endIndex,
    }

    let nextStartIndex = endIndex
    let nextEndIndex = startIndex
    const formats: FormatItem<any>[] = []
    const columnedFormats: FormatItem<any>[] = []

    Array.from(copyFormat.map.keys()).forEach(formatter => {
      const ranges = copyFormat.map.get(formatter)!
      ranges.forEach(range => {
        if (range.startIndex === startIndex && range.endIndex === endIndex) {
          if (formatter.columned) {
            columnedFormats.push({
              formatter,
              ...range
            })
          } else {
            formats.push({
              formatter,
              ...range
            })
            copyFormat.map.delete(formatter)
          }
        } else if (range.startIndex < nextStartIndex) {
          nextStartIndex = range.startIndex
          nextEndIndex = range.endIndex
        } else if (range.startIndex === nextStartIndex) {
          nextEndIndex = Math.max(nextEndIndex, range.endIndex)
        }
      })
    })

    const hasChildren = copyFormat.map.size > columnedFormats.length
    if (hasChildren) {
      tree.children = []
      if (startIndex < nextStartIndex) {
        if (columnedFormats.length) {
          const childTree = copyFormat.extract(startIndex, nextStartIndex).toTree(startIndex, nextStartIndex)
          tree.children.push(childTree)
        } else {
          tree.children.push({
            startIndex,
            endIndex: nextStartIndex
          })
        }
      }

      const push = function (tree: FormatTree<any>, childTree: FormatTree<any>) {
        if (childTree.formats) {
          tree.children!.push(childTree)
        } else if (childTree.children) {
          tree.children!.push(...childTree.children)
        } else {
          tree.children!.push(childTree)
        }
      }
      const nextTree = copyFormat.toTree(nextStartIndex, nextEndIndex)
      push(tree, nextTree)

      if (nextEndIndex < endIndex) {
        const afterFormat = copyFormat.extract(nextEndIndex, endIndex)
        const afterTree = afterFormat.toTree(nextEndIndex, endIndex)
        push(tree, afterTree)
      }
    } else {
      formats.push(...columnedFormats)
    }

    if (formats.length) {
      tree.formats = formats.sort((a, b) => {
        return a.formatter.priority - b.formatter.priority
      })
    }
    return tree
  }

  toArray() {
    const list: FormatItem<any>[] = []
    Array.from(this.map).forEach(i => {
      const formatter = i[0]
      i[1].forEach(range => {
        list.push({
          ...range,
          formatter
        })
      })
    })
    return list
  }

  private normalizeFormatRange(background: boolean, oldRanges: FormatRange<any>[], newRange?: FormatRange<any>) {
    const length = this.slot.length
    oldRanges = oldRanges.filter(range => {
      range.endIndex = Math.min(range.endIndex, length)
      return range.startIndex < range.endIndex
    })
    if (newRange) {
      if (background) {
        oldRanges.unshift(newRange)
      } else {
        oldRanges.push(newRange)
      }
    }
    if (oldRanges.length === 0) {
      return []
    }

    let mergedRanges: FormatRange<any>[] = [oldRanges.at(0)!]
    for (let i = 1; i < oldRanges.length; i++) {
      const range = oldRanges[i]
      mergedRanges = Format.mergeRanges(mergedRanges, range)
    }
    return mergedRanges.filter(range => {
      return !isVoid(range.value)
    })
  }

  private static equal(left: FormatValue, right: FormatValue): boolean {
    // 严格相等检查
    if (left === right) {
      return true
    }
    
    // null 或 undefined 检查
    if (left === null || left === undefined || right === null || right === undefined) {
      return left === right
    }
    
    // 类型不同直接返回 false
    if (typeof left !== typeof right) {
      return false
    }
    
    // 基本类型比较
    if (typeof left !== 'object') {
      return left === right
    }
    
    // 数组比较
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        return false
      }
      return left.every((item, index) => Format.equal(item, right[index]))
    }
    
    // 一个是数组一个不是
    if (Array.isArray(left) || Array.isArray(right)) {
      return false
    }
    
    // 对象比较
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    
    if (leftKeys.length !== rightKeys.length) {
      return false
    }
    
    // 递归比较每个属性
    return leftKeys.every(key => {
      return rightKeys.includes(key) && Format.equal(left[key], right[key])
    })
  }

  private static mergeRanges(ranges: FormatRange[], newRange: FormatRange) {
    const results: FormatRange[] = []
    let isMerged = false
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i]
      if (isMerged) {
        results.push(range)
        continue
      }
      if (range.endIndex < newRange.startIndex) {
        results.push(range)
        continue
      }
      if (range.startIndex > newRange.endIndex) {
        results.push(newRange)
        results.push(range)
        isMerged = true
        continue
      }
      const before = range
      let last: FormatRange | null = null

      // if (before.endIndex <= newRange.endIndex) {
      //   i++
      // }
      for (; i < ranges.length; i++) {
        const next = ranges[i]
        if (next.startIndex <= newRange.endIndex) {
          last = next
        } else {
          i--
          break
        }
      }
      if (!last) {
        results.push(newRange)
        isMerged = true
        continue
      }
      if (Format.equal(before.value, newRange.value)) {
        newRange.startIndex = Math.min(before.startIndex, newRange.startIndex)
        newRange.endIndex = Math.max(before.endIndex, newRange.endIndex)
      }
      if (before.startIndex < newRange.startIndex) {
        results.push({
          startIndex: before.startIndex,
          endIndex: newRange.startIndex,
          value: before.value
        })
      }
      if (Format.equal(last.value, newRange.value)) {
        results.push({
          startIndex: Math.min(last.startIndex, newRange.startIndex),
          endIndex: Math.max(last.endIndex, newRange.endIndex),
          value: newRange.value
        })
        isMerged = true
        continue
      }
      results.push(newRange)
      if (newRange.endIndex < last.endIndex) {
        results.push({
          startIndex: newRange.endIndex,
          endIndex: last.endIndex,
          value: last.value
        })
      }
      isMerged = true
    }
    if (!isMerged) {
      results.push(newRange)
    }
    return results
  }
}
