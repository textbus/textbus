import { FormatRange, Formatter } from './formatter';

export class FormatMap {
  private map = new Map<Formatter, FormatRange[]>();

  getCanApplyFormats() {
    let formats: FormatRange[] = [];
    // 检出所有生效规则
    this.map.forEach(value => {
      formats = formats.concat(value);
    });
    // 排序所有生效规则并克隆副本，防止修改原始数据，影响第二次变更检测
    return formats.sort((next, prev) => {

      const a = next.startIndex - prev.startIndex;
      if (a === 0) {
        return next.endIndex - prev.endIndex;
      }
      return a;
    });
  }

  merge(formatter: FormatRange) {
    const oldFormats = this.map.get(formatter.renderer);
    if (!Array.isArray(oldFormats)) {
      this.map.set(formatter.renderer, [formatter]);
      return;
    }
    const newFormatMarks: FormatRange[] = [];
    const formatRanges: FormatRange[] = [];
    oldFormats.push(formatter);
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
          renderer: mark.renderer
        };
        formatRanges.push(newFormatRange);
        continue;
      }
      if (mark.abstractData &&
        newFormatRange.abstractData &&
        mark.abstractData.equal(newFormatRange.abstractData) || !mark.abstractData === true && !newFormatRange.abstractData === true) {
        newFormatRange.endIndex = i + 1;
      } else {
        newFormatRange = {
          startIndex: i,
          endIndex: i + 1,
          abstractData: mark.abstractData,
          renderer: mark.renderer
        };
        formatRanges.push(newFormatRange);
      }
    }
    if (formatRanges.length) {
      this.map.set(formatter.renderer, formatRanges);
    } else {
      this.map.delete(formatter.renderer);
    }
  }
}
