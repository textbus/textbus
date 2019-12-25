import { FormatRange } from './format';
import { Handler } from '../toolbar/handlers/help';
import { FormatState } from '../matcher/matcher';

export function getCanApplyFormats(formatMatrix: Map<Handler, FormatRange[]>) {
  let formats: FormatRange[] = [];
  // 检出所有生效规则
  formatMatrix.forEach(value => {
    formats = formats.concat(value);
  });
  // 排序所有生效规则并克隆副本，防止修改原始数据，影响第二次变更检测
  return formats.sort((n, m) => {
    const a = n.startIndex - m.startIndex;
    if (a === 0) {
      const b = m.endIndex - n.endIndex;
      if (b === 0) {
        return n.handler.priority - m.handler.priority;
      }
      return b;
    }
    return a;
  }).map(item => item.clone());
}

/**
 * 合并当前片段的格式化信息
 * @param matrix
 * @param format
 * @param important
 */
export function mergeFormat(matrix: Map<Handler, FormatRange[]>, format: FormatRange, important = false) {
  const oldFormats = matrix.get(format.handler);
  let formatRanges: FormatRange[] = [];

  if (oldFormats) {
    const formatMarks: Array<FormatRange> = [];
    if (important) {
      oldFormats.unshift(format);
    } else {
      oldFormats.push(format);
    }
    let index = oldFormats.length - 1;
    while (index >= 0) {
      const item = oldFormats[index];
      if (formatMarks.length < item.endIndex) {
        formatMarks.length = item.endIndex;
      }
      formatMarks.fill(item, item.startIndex, item.endIndex);
      index--;
    }
    let newFormatRange: FormatRange = null;
    for (let i = 0; i < formatMarks.length; i++) {
      const mark = formatMarks[i];

      if (!mark) {
        newFormatRange = null;
        continue;
      }
      if (!newFormatRange) {
        newFormatRange = new FormatRange({
          startIndex: i,
          endIndex: i + 1,
          handler: mark.handler,
          context: mark.context,
          state: mark.state,
          cacheData: mark.cacheData
        });
        formatRanges.push(newFormatRange);
        continue;
      }
      if (mark.state === newFormatRange.state && (
        mark.cacheData &&
        newFormatRange.cacheData &&
        mark.cacheData.equal(newFormatRange.cacheData) || !mark.cacheData === true && !newFormatRange.cacheData === true)) {
        newFormatRange.endIndex = i + 1;
      } else {
        newFormatRange = new FormatRange({
          startIndex: i,
          endIndex: i + 1,
          handler: mark.handler,
          context: mark.context,
          state: mark.state,
          cacheData: mark.cacheData
        });
        formatRanges.push(newFormatRange);
      }
    }
  } else {
    formatRanges.push(format);
  }
  const ff = formatRanges.filter(f => f.state !== FormatState.Invalid);
  if (ff.length) {
    matrix.set(format.handler, ff);
  } else {
    matrix.delete(format.handler);
  }
}
