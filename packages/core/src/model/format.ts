import { AttributeFormatter, BlockFormatter, Formatter, FormatType, InlineFormatter } from './formatter'
import { Slot } from './slot'

export type FormatValue = string | number | boolean | null | Record<string, string | number | boolean>

export interface FormatRange {
  startIndex: number
  endIndex: number
  value: FormatValue
}

export interface FormatLiteral {
  [key: string]: FormatRange[]
}

export interface FormatItem {
  formatter: Formatter
  value: FormatValue,
  startIndex: number
  endIndex: number
}

export interface FormatTree {
  startIndex: number
  endIndex: number
  children?: FormatTree[]
  formats?: FormatItem[]
}

/**
 * Textbus 格式管理类
 */
export class Format {
  private map = new Map<Formatter, FormatRange[]>()

  constructor(private slot: Slot) {
  }

  /**
   * 将新样式合并到现有样式中
   * @param formatter
   * @param value
   */
  merge(formatter: BlockFormatter, value: FormatValue): this
  merge(formatter: InlineFormatter | AttributeFormatter, value: FormatRange): this
  merge(formatter: Formatter, value: FormatValue | FormatRange): this {
    if (formatter.type === FormatType.Block) {
      if (value === null || typeof value === 'undefined') {
        this.map.delete(formatter)
      } else {
        this.map.set(formatter, [{
          startIndex: 0,
          endIndex: this.slot.length,
          value: value as FormatValue
        }])
      }
      return this
    }
    let ranges = this.map.get(formatter)
    if (!ranges) {
      const v = (value as FormatRange).value
      if (v === null || typeof v === 'undefined') {
        return this
      }
      ranges = [value as FormatRange]
      this.map.set(formatter, ranges)
      return this
    }

    const newRanges = Format.normalizeFormatRange(ranges, value as FormatRange)
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
    const expandedValues = Array.from<string>({length: distance})
    Array.from(this.map).forEach(([key, formatRanges]) => {
      if (key.type === FormatType.Block) {
        formatRanges.forEach(i => {
          i.endIndex += distance
        })
        return
      }
      const values = Format.tileRanges(formatRanges)
      values.splice(index, 0, ...expandedValues)
      const newRanges = Format.toRanges(values)
      this.map.set(key, newRanges)
    })
    return this
  }

  /**
   * 从指定 index 位置的样式删除 count
   * @param index
   * @param count
   */
  shrink(index: number, count: number) {
    const startIndex = index - count
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
      const newRanges = Format.normalizeFormatRange(oldRanges)
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
   */
  extract(startIndex: number, endIndex: number): Format {
    const format = new Format(this.slot)
    this.map.forEach((ranges, key) => {
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
  extractFormatRangesByFormatter(startIndex: number, endIndex: number, formatter: Formatter) {
    const extractRanges: FormatRange[] = []

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
  discard(formatter: Formatter, startIndex: number, endIndex: number) {
    const oldRanges = this.map.get(formatter)
    if (oldRanges) {
      Format.normalizeFormatRange(oldRanges, {
        startIndex,
        endIndex,
        value: null as any
      })
    }
    return this
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
    const json: FormatLiteral = {}
    this.map.forEach((value, formatter) => {
      json[formatter.name] = value.map(i => ({...i}))
    })
    return json
  }

  toTree(startIndex: number, endIndex: number): FormatTree {
    const copyFormat = this.extract(startIndex, endIndex)
    const tree: FormatTree = {
      startIndex,
      endIndex,
    }

    let nextStartIndex = endIndex
    let nextEndIndex = startIndex
    Array.from(copyFormat.map.keys()).forEach(formatter => {
      const ranges = copyFormat.map.get(formatter)!
      ranges.forEach(range => {
        if (range.startIndex === startIndex && range.endIndex === endIndex) {
          if (!tree.formats) {
            tree.formats = []
          }
          tree.formats.push({
            formatter,
            ...range
          })
          copyFormat.map.delete(formatter)
        } else {
          if (range.startIndex < nextStartIndex) {
            nextStartIndex = range.startIndex
            nextEndIndex = range.endIndex
          } else if (range.startIndex === nextStartIndex) {
            nextEndIndex = Math.max(nextEndIndex, range.endIndex)
          }
        }
      })
    })

    if (copyFormat.map.size) {
      tree.children = []
      if (startIndex < nextStartIndex) {
        tree.children.push({
          startIndex,
          endIndex: nextStartIndex
        })
      }
      tree.children.push(copyFormat.toTree(nextStartIndex, nextEndIndex))

      if (nextEndIndex < endIndex) {
        const afterFormat = copyFormat.extract(nextEndIndex, endIndex)
        const afterTree = afterFormat.toTree(nextEndIndex, endIndex)
        if (afterTree.formats) {
          tree.children.push(afterTree)
        } else if (afterTree.children) {
          tree.children.push(...afterTree.children)
        } else {
          tree.children.push(afterTree)
        }
      }
    }

    return tree
  }

  toArray() {
    const list: FormatItem[] = []
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

  static normalizeFormatRange(oldRanges: FormatRange[], newRange?: FormatRange) {
    if (newRange) {
      oldRanges = [...oldRanges, newRange]
    }
    const formatValues: Array<FormatValue> = Format.tileRanges(oldRanges)

    return Format.toRanges(formatValues)
  }

  static tileRanges(ranges: FormatRange[]) {
    const formatValues: Array<FormatValue> = []
    ranges.forEach(range => {
      formatValues.length = Math.max(formatValues.length, range.endIndex)
      formatValues.fill(range.value, range.startIndex, range.endIndex)
    })
    return formatValues
  }

  static toRanges(values: Array<FormatValue>) {
    const newRanges: FormatRange[] = []
    let range: FormatRange = null as any
    for (let i = 0; i < values.length; i++) {
      const item = values[i]
      if (typeof item === 'undefined' || item === null) {
        range = null as any
        continue
      }
      if (Format.equal(range?.value, item)) {
        range.endIndex = i + 1
        continue
      }
      range = {
        startIndex: i,
        endIndex: i + 1,
        value: item
      }
      newRanges.push(range)
    }

    return newRanges
  }

  private static equal(left: FormatValue, right: FormatValue): boolean {
    if (left === right) {
      return true
    }
    if (typeof left === 'object' && typeof right === 'object') {
      const leftKeys = Object.keys(left!)
      const rightKeys = Object.keys(right!)
      if (leftKeys.length === rightKeys.length) {
        return leftKeys.every(key => {
          return rightKeys.includes(key) && right![key] === left![key]
        })
      }
    }
    return false
  }
}
