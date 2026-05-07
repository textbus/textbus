import { Component, ComponentLiteral } from './component'

let firstRun = true

/** 窗口分段：索引前后保留的 UTF-16 码元宽度（覆盖常见 emoji / ZWJ 簇） */
const GRAPHEME_PREFIX_MARGIN = 512

type SegmentsWithContaining = Intl.Segments & {
  containing?(codeUnitIndex: number): Intl.SegmentData | undefined | null
}

/** 勿在 supplementary 低位 surrogate 上切开窗口 */
function alignUtf16ClusterStart(item: string, start: number): number {
  let s = Math.max(0, Math.min(start, item.length))
  while (s > 0 && (item.charCodeAt(s) & 0xfc00) === 0xdc00) {
    s--
  }
  return s
}

/** 在 `text` 内（坐标相对 text 起点）修正落在 grapheme 内部的 relIndex；截断导致无法覆盖时返回 null */
function snapGraphemeCluster(
  segmenter: Intl.Segmenter,
  text: string,
  relIndex: number,
  toEnd: boolean,
): number | null {
  if (relIndex < 0 || relIndex > text.length) {
    return null
  }
  let offsetIndex = 0
  for (const seg of segmenter.segment(text)) {
    const length = seg.segment.length
    const nextOffset = offsetIndex + length
    if (nextOffset === relIndex) {
      return relIndex
    }
    if (nextOffset > relIndex) {
      return toEnd ? nextOffset : offsetIndex
    }
    offsetIndex = nextOffset
  }
  return offsetIndex < relIndex ? null : relIndex
}

/**
 * 无 `Segments#containing` 时：近端用前缀窗口，远端用对称窗口 + 左扩对齐，多起点投票一致则采纳，否则整串分段。
 */
function correctStringIndexWithoutContaining(
  segmenter: Intl.Segmenter,
  item: string,
  localIndex: number,
  toEnd: boolean,
): number {
  const len = item.length

  if (localIndex <= GRAPHEME_PREFIX_MARGIN) {
    const prefixEnd = Math.min(len, localIndex + GRAPHEME_PREFIX_MARGIN)
    const text = item.slice(0, prefixEnd)
    const snapped = snapGraphemeCluster(segmenter, text, localIndex, toEnd)
    if (snapped !== null) {
      return snapped
    }
  }

  const votes = new Map<number, number>()
  const rough = Math.max(0, localIndex - GRAPHEME_PREFIX_MARGIN)
  for (let delta = 0; delta <= GRAPHEME_PREFIX_MARGIN; delta++) {
    const start = alignUtf16ClusterStart(item, rough - delta)
    const end = Math.min(len, localIndex + GRAPHEME_PREFIX_MARGIN)
    if (start >= end) {
      continue
    }
    const sub = item.slice(start, end)
    const snappedRel = snapGraphemeCluster(segmenter, sub, localIndex - start, toEnd)
    if (snappedRel !== null) {
      const globalIdx = start + snappedRel
      votes.set(globalIdx, (votes.get(globalIdx) ?? 0) + 1)
    }
  }

  let bestIdx = localIndex
  let bestCount = 0
  for (const [idx, c] of votes) {
    if (
      c > bestCount
      || (c === bestCount && Math.abs(idx - localIndex) < Math.abs(bestIdx - localIndex))
    ) {
      bestCount = c
      bestIdx = idx
    }
  }

  if (bestCount >= 2) {
    return bestIdx
  }

  let offsetIndex = 0
  for (const seg of segmenter.segment(item)) {
    const length = seg.segment.length
    const nextOffset = offsetIndex + length
    if (nextOffset === localIndex) {
      return localIndex
    }
    if (nextOffset > localIndex) {
      return toEnd ? nextOffset : offsetIndex
    }
    offsetIndex = nextOffset
  }
  return localIndex
}

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
    const segmenter = Content.segmenter
    let i = 0
    for (const item of this.data) {
      const itemLength = item.length
      if (typeof item === 'string') {
        if (index > i && index < i + itemLength) {
          const localIndex = index - i
          const segments = segmenter.segment(item)

          const containing = (segments as SegmentsWithContaining).containing
          if (typeof containing === 'function') {
            const seg = containing.call(segments, localIndex)
            if (seg) {
              const start = seg.index
              const end = start + seg.segment.length
              if (localIndex > start && localIndex < end) {
                return (toEnd ? end : start) + i
              }
            }
            return index
          }

          return correctStringIndexWithoutContaining(segmenter, item, localIndex, toEnd) + i
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
