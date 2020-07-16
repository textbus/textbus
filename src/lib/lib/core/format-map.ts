import { BlockFormatter, FormatEffect, FormatRange, InlineFormatter } from './formatter';

export class FormatMap {
  private map = new Map<InlineFormatter | BlockFormatter, Array<FormatRange>>();

  /**
   * 通过 Handler 获取当前片段的的格式化信息。
   * @param formatter
   */
  getFormatRangesByFormatter(formatter: InlineFormatter | BlockFormatter) {
    return this.map.get(formatter) || [];
  }

  /**
   * 获取当前片段内所有的格式化信息。
   */
  getFormatRanges() {
    return Array.from(this.map.values()).reduce((v, n) => v.concat(n), []);
  }

  /**
   * 获取可生效的格式数据。
   */
  getCanApplyFormats() {
    let formats: FormatRange[] = [];
    // 检出所有生效规则
    this.map.forEach(value => {
      formats = formats.concat(value);
    });
    return formats;
  }

  /**
   * 合并格式
   * @param formatter 当前要合并的格式
   * @param important 合并的优先级
   */
  merge(formatter: FormatRange, important: boolean) {
    if (formatter.renderer instanceof BlockFormatter) {
      if (formatter.state === FormatEffect.Invalid) {
        this.map.delete(formatter.renderer);
      } else {
        const oldFormats = this.map.get(formatter.renderer);
        if (oldFormats) {
          for (let i = 0; i < oldFormats.length; i++) {
            const format = oldFormats[i];
            if (format.abstractData?.equal(formatter.abstractData, false)) {
              if (!format.abstractData?.equal(formatter.abstractData)) {
                oldFormats[i] = formatter;
              }
              return;
            }
          }
          oldFormats.push(formatter);
        } else {
          this.map.set(formatter.renderer, [formatter]);
        }
      }
      return;
    }
    const oldFormats = this.map.get(formatter.renderer) as FormatRange[];
    if (!Array.isArray(oldFormats)) {
      if (formatter.state !== FormatEffect.Invalid) {
        this.map.set(formatter.renderer, [formatter]);
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
          abstractData: mark.abstractData,
          renderer: mark.renderer,
          state: mark.state
        };
        formatRanges.push(newFormatRange);
        continue;
      }
      if (mark.state === newFormatRange.state && (mark.abstractData &&
        newFormatRange.abstractData &&
        mark.abstractData.equal(newFormatRange.abstractData) || !mark.abstractData === true && !newFormatRange.abstractData === true)) {
        newFormatRange.endIndex = i + 1;
      } else {
        newFormatRange = {
          startIndex: i,
          endIndex: i + 1,
          abstractData: mark.abstractData,
          renderer: mark.renderer,
          state: mark.state
        };
        formatRanges.push(newFormatRange);
      }
    }
    const ff = formatRanges.filter(f => f.state !== FormatEffect.Invalid);
    if (ff.length) {
      this.map.set(formatter.renderer, ff);
    } else {
      this.map.delete(formatter.renderer);
    }
  }
}
