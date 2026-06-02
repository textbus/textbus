import { Formatter, StackableFormatter } from './attribute'
import { Slot } from './slot'

/**
 * 格式或属性的值，必须为可被 JSON 序列化的字面量
 */
export type FormatValue = NonNullable<any>

/**
 * 一组格式
 */
export type Formats<T = FormatValue> = [formatter: Formatter, value: T][]

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
  return data === null || typeof data === 'undefined' || data instanceof PendingErasure
}

export class PendingErasure<T> {
  constructor(public erasureAll: boolean,
              public value?: T) {
  }
}

/**
 * Textbus 格式管理类
 * Format 类为 Slot 的私有属性，在实际场景中，开发者不需在关注此类，也不需要访问或操作此类
 */
export class Format {
  private map = new Map<Formatter, FormatRange<any>[]>()

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

    const newRanges = this.normalizeFormatRange(background, formatter instanceof StackableFormatter, ranges, value)
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
          newRanges.push({...range})
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
      const newRanges = this.normalizeFormatRange(false, key instanceof StackableFormatter, oldRanges)
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
  extractFormatRangesByFormatter(startIndex: number, endIndex: number, formatter: Formatter) {
    const extractRanges: FormatRange[] = []

    const ranges = this.map.get(formatter) || []
    ranges.forEach(range => {
      if (range.startIndex >= endIndex || range.endIndex < startIndex) {
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
      this.normalizeFormatRange(false, formatter instanceof StackableFormatter, oldRanges, {
        startIndex,
        endIndex,
        value: null as any
      })
    }
    return this
  }

  extractFormatsByIndex(index: number) {
    if (index < 0) {
      index = 0
    }
    const formats: Formats = []
    this.map.forEach((ranges, formatter) => {
      ranges.forEach(i => {
        if (i.startIndex <= index && i.endIndex > index) {
          formats.push([
            formatter,
            i.value
          ])
        }
      })
    })
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
      json[formatter.name] = value.map(i => ({...i}))
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

    const formatters = copyFormat.map.keys()
    for (const formatter of formatters) {
      const ranges = copyFormat.map.get(formatter)!
      for (let j = 0; j < ranges.length; j++) {
        const range = ranges[j]
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
            if (formatter instanceof StackableFormatter) {
              if (ranges.length === 1) {
                copyFormat.map.delete(formatter)
              } else {
                ranges.splice(j, 1)
                j--
              }
            } else {
              copyFormat.map.delete(formatter)
            }
          }
        } else if (range.startIndex < nextStartIndex) {
          nextStartIndex = range.startIndex
          nextEndIndex = range.endIndex
        } else if (range.startIndex === nextStartIndex) {
          nextEndIndex = Math.max(nextEndIndex, range.endIndex)
        }
      }
    }

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

  private normalizeFormatRange(background: boolean,
                               stackable: boolean,
                               oldRanges: FormatRange<any>[],
                               newRange?: FormatRange<any>) {
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
      mergedRanges = Format.mergeRanges(mergedRanges, range, stackable)
    }
    return mergedRanges.filter(range => {
      return !isVoid(range.value)
    })
  }

  static equal(left: FormatValue, right: FormatValue): boolean {
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

  /** 保留 range 在 [cutStart, cutEnd) 之外的片段 */
  private static clipRangeOutside(range: FormatRange, cutStart: number, cutEnd: number): FormatRange[] {
    if (range.endIndex <= cutStart || range.startIndex >= cutEnd) {
      return [range]
    }
    const parts: FormatRange[] = []
    if (range.startIndex < cutStart) {
      parts.push({ startIndex: range.startIndex, endIndex: cutStart, value: range.value })
    }
    if (range.endIndex > cutEnd) {
      parts.push({ startIndex: cutEnd, endIndex: range.endIndex, value: range.value })
    }
    return parts
  }

  /** 在 [eraseStart, eraseEnd) 内按条件擦除；不相交区间原样保留 */
  private static applyErasure(
    ranges: FormatRange[],
    eraseStart: number,
    eraseEnd: number,
    shouldErase: (value: FormatValue) => boolean,
  ): FormatRange[] {
    const result: FormatRange[] = []
    for (const range of ranges) {
      if (range.endIndex <= eraseStart || range.startIndex >= eraseEnd) {
        result.push(range)
        continue
      }
      if (shouldErase(range.value)) {
        result.push(...Format.clipRangeOutside(range, eraseStart, eraseEnd))
      } else {
        result.push(range)
      }
    }
    return result
  }

  /** 相邻且取值相同的区间合并为一项（按取值分组，避免排序后中间夹着其它取值而无法合并） */
  private static mergeAdjacentSameValue(ranges: FormatRange[]): FormatRange[] {
    if (ranges.length === 0) {
      return []
    }
    const valueGroups: FormatRange[][] = []
    for (const range of ranges) {
      let group = valueGroups.find(g => Format.equal(g[0].value, range.value))
      if (!group) {
        group = []
        valueGroups.push(group)
      }
      group.push(range)
    }

    const result: FormatRange[] = []
    for (const group of valueGroups) {
      const sorted = [...group].sort((a, b) => {
        const n = a.startIndex - b.startIndex
        return n !== 0 ? n : a.endIndex - b.endIndex
      })
      let chain: FormatRange = { ...sorted[0] }
      for (let i = 1; i < sorted.length; i++) {
        const cur = sorted[i]
        if (chain.endIndex === cur.startIndex) {
          chain.endIndex = cur.endIndex
        } else {
          result.push(chain)
          chain = { ...cur }
        }
      }
      result.push(chain)
    }

    return result.sort((a, b) => {
      const n = a.startIndex - b.startIndex
      return n !== 0 ? n : a.endIndex - b.endIndex
    })
  }

  private static mergeStackableValue(ranges: FormatRange[], newRange: FormatRange): FormatRange[] {
    const merged: FormatRange = {
      startIndex: newRange.startIndex,
      endIndex: newRange.endIndex,
      value: newRange.value,
    }
    const result: FormatRange[] = []
    for (const range of ranges) {
      if (range.endIndex <= merged.startIndex || range.startIndex >= merged.endIndex) {
        result.push(range)
      } else if (Format.equal(range.value, merged.value)) {
        merged.startIndex = Math.min(merged.startIndex, range.startIndex)
        merged.endIndex = Math.max(merged.endIndex, range.endIndex)
      } else {
        result.push(range)
      }
    }
    result.push(merged)
    return Format.mergeAdjacentSameValue(result)
  }

  private static mergeNonStackableValue(ranges: FormatRange[], newRange: FormatRange): FormatRange[] {
    const { startIndex: ns, endIndex: ne, value } = newRange
    const result: FormatRange[] = []
    for (const range of ranges) {
      if (range.endIndex <= ns || range.startIndex >= ne) {
        result.push(range)
        continue
      }
      if (range.startIndex < ns) {
        result.push({ startIndex: range.startIndex, endIndex: ns, value: range.value })
      }
      if (range.endIndex > ne) {
        result.push({ startIndex: ne, endIndex: range.endIndex, value: range.value })
      }
    }
    result.push({ startIndex: ns, endIndex: ne, value })
    return Format.mergeAdjacentSameValue(result)
  }

  private static mergeRanges(ranges: FormatRange[], newRange: FormatRange, stackable: boolean): FormatRange[] {
    const v = newRange.value
    const { startIndex: eraseStart, endIndex: eraseEnd } = newRange

    if (isVoid(v)) {
      if (v instanceof PendingErasure) {
        if (v.erasureAll) {
          return Format.mergeAdjacentSameValue(
            Format.applyErasure(ranges, eraseStart, eraseEnd, () => true),
          )
        }
        const target = v.value
        return Format.mergeAdjacentSameValue(
          Format.applyErasure(ranges, eraseStart, eraseEnd, rv => Format.equal(rv, target)),
        )
      }
      return Format.mergeAdjacentSameValue(
        Format.applyErasure(ranges, eraseStart, eraseEnd, () => true),
      )
    }

    if (stackable) {
      return Format.mergeStackableValue(ranges, newRange)
    }
    return Format.mergeNonStackableValue(ranges, newRange)
  }
}
