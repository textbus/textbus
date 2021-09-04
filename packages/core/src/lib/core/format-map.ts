import { BlockFormatter, FormatEffect, FormatRange, InlineFormatter } from './formatter';

/**
 * 内部是对 Map<InlineFormatter | BlockFormatter, FormatRange[]> 的封装。
 * 并提供格式合并的功能。
 */
export class FormatMap {
  private map = new Map<InlineFormatter | BlockFormatter, FormatRange[]>();

  keys() {
    return this.map.keys();
  }

  get(formatter: InlineFormatter | BlockFormatter) {
    return this.map.get(formatter);
  }

  set(formatter: InlineFormatter | BlockFormatter, formatRanges: FormatRange[]) {
    this.map.set(formatter, formatRanges);
  }

  /**
   * 合并格式
   * @param token 当前格式类别
   * @param formatter 当前要合并的格式
   * @param important 合并的优先级
   */
  merge(token: InlineFormatter | BlockFormatter, formatter: FormatRange, important: boolean) {
    if (token instanceof BlockFormatter) {
      if (formatter.effect === FormatEffect.Invalid) {
        this.map.delete(token);
      } else {
        this.map.set(token, [formatter]);
      }
      return;
    }
    const oldFormats = this.map.get(token) as FormatRange[];
    if (!Array.isArray(oldFormats)) {
      if (formatter.effect !== FormatEffect.Invalid) {
        this.map.set(token, [formatter]);
      }
      return;
    }
    const newFormatMarks: FormatRange[] = [];
    const formatRanges: FormatRange[] = [];
    important ? oldFormats.push(formatter) : oldFormats.unshift(formatter);
    while (oldFormats.length) {
      const first = oldFormats.shift();
      if (newFormatMarks.length < first.endIndex) {
        newFormatMarks.length = first.endIndex;
      }
      newFormatMarks.fill(first, first.startIndex, first.endIndex);
    }
    let newFormatRange: FormatRange = null;
    for (let i = 0; i < newFormatMarks.length; i++) {
      const mark = newFormatMarks[i];
      if (!mark) {
        newFormatRange = null;
        continue;
      }
      if (!newFormatRange) {
        newFormatRange = {
          startIndex: i,
          endIndex: i + 1,
          formatData: mark.formatData,
          effect: mark.effect
        };
        formatRanges.push(newFormatRange);
        continue;
      }
      if (mark.effect === newFormatRange.effect && (mark.formatData &&
        newFormatRange.formatData &&
        mark.formatData.equal(newFormatRange.formatData) || !mark.formatData === true && !newFormatRange.formatData === true)) {
        newFormatRange.endIndex = i + 1;
      } else {
        newFormatRange = {
          startIndex: i,
          endIndex: i + 1,
          formatData: mark.formatData,
          effect: mark.effect
        };
        formatRanges.push(newFormatRange);
      }
    }
    const ff = formatRanges.filter(f => f.effect !== FormatEffect.Invalid);
    if (ff.length) {
      this.map.set(token, ff);
    } else {
      this.map.delete(token);
    }
  }
}
