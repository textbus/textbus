import { Handler } from '../toolbar/handlers/help';
import { BlockFormat, FormatRange, InlineFormat } from './format';
import { MatchState } from '../matcher/matcher';

export class FormatMap {
  private data = new Map<Handler, FormatRange[]>();

  constructor() {
  }

  /**
   * 通过 Handler 设置一组格式化数据
   * @param key
   * @param formatRanges
   */
  setFormats(key: Handler, formatRanges: FormatRange[]) {
    this.data.set(key, formatRanges);
  }

  /**
   * 获取当前片段内所有的格式化信息
   */
  getFormatRanges() {
    return Array.from(this.data.values()).reduce((v, n) => v.concat(n), []);
  }

  /**
   * 获取当前片段内所有的 Handler
   */
  getFormatHandlers() {
    return Array.from(this.data.keys());
  }

  /**
   * 通过 Handler 获取当前片段的的格式化信息
   * @param handler
   */
  getFormatRangesByHandler(handler: Handler) {
    return this.data.get(handler);
  }

  /**
   * 获取当前片段格式化信息的副本
   */
  getFormatMap() {
    const formatMap = new Map<Handler, Array<BlockFormat | InlineFormat>>();
    Array.from(this.data.keys()).forEach(key => {
      formatMap.set(key, this.data.get(key).map(i => {
        const c = i.clone();
        c.context = null;
        return c;
      }));
    });
    return formatMap;
  }

  clear() {
    this.data.clear();
  }

  /**
   * 获了格式化信息中所有的可应用的数据
   */
  getCanApplyFormats() {
    let formats: FormatRange[] = [];
    // 检出所有生效规则
    this.data.forEach(value => {
      formats = formats.concat(value);
    });
    // 排序所有生效规则并克隆副本，防止修改原始数据，影响第二次变更检测
    return formats.filter(i => i.state !== MatchState.Inherit).sort((next, prev) => {
      if (prev instanceof BlockFormat) {
        if (next instanceof BlockFormat) {
          return next.handler.priority - prev.handler.priority;
        }
        return 1;
      } else if (next instanceof BlockFormat) {
        return -1;
      }

      const a = next.startIndex - prev.startIndex;
      if (a === 0) {
        let b = next.endIndex - prev.endIndex;
        if (b === 0) {
          return next.handler.priority - prev.handler.priority;
        }
      }
      return a;
    }).map(item => item.clone());
  }

  /**
   * 合并当前片段的格式化信息
   * @param format
   * @param important
   */
  mergeFormat(format: FormatRange, important = false) {

    if (format instanceof BlockFormat) {
      if (format.state === MatchState.Invalid) {
        this.data.delete(format.handler);
      } else {
        this.data.set(format.handler, [format]);
      }
      return;
    }

    let formatRanges: Array<InlineFormat | BlockFormat> = [];
    const oldFormats = this.data.get(format.handler)?.filter(i => {
      if (i instanceof InlineFormat) {
        return true;
      }
      formatRanges.push(i);
      return false;
    }) as InlineFormat[];


    if (oldFormats) {
      const minFormatRanges: InlineFormat[] = [];
      const formatMarks: Array<InlineFormat> = [];
      if (important) {
        oldFormats.unshift(format);
      } else {
        oldFormats.push(format);
      }
      let index = oldFormats.length - 1;

      while (index >= 0) {
        const item = oldFormats[index];
        if (item.startIndex === item.endIndex) {
          minFormatRanges.push(item);
        } else {
          if (formatMarks.length < item.endIndex) {
            formatMarks.length = item.endIndex;
          }
          formatMarks.fill(item, item.startIndex, item.endIndex);
        }
        index--;
      }
      let newFormatRange: InlineFormat = null;
      for (let i = 0; i < formatMarks.length; i++) {
        const mark = formatMarks[i];

        if (!mark) {
          newFormatRange = null;
          continue;
        }
        if (!newFormatRange) {
          newFormatRange = new InlineFormat({
            startIndex: i,
            endIndex: i + 1,
            handler: mark.handler,
            context: mark.context,
            state: mark.state,
            abstractData: mark.abstractData
          });
          formatRanges.push(newFormatRange);
          continue;
        }
        if (mark.state === newFormatRange.state && (
          mark.abstractData &&
          newFormatRange.abstractData &&
          mark.abstractData.equal(newFormatRange.abstractData) || !mark.abstractData === true && !newFormatRange.abstractData === true)) {
          newFormatRange.endIndex = i + 1;
        } else {
          newFormatRange = new InlineFormat({
            startIndex: i,
            endIndex: i + 1,
            handler: mark.handler,
            context: mark.context,
            state: mark.state,
            abstractData: mark.abstractData
          });
          formatRanges.push(newFormatRange);
        }
      }
      minFormatRanges.forEach(item => {
        const flag = oldFormats.filter(f => {
          return f.startIndex <= item.startIndex && f.endIndex >= item.endIndex && item !== f;
        }).length === 0;
        if (flag) {
          formatRanges.push(item);
        }
      })
    } else {
      formatRanges.push(format);
    }
    const ff = formatRanges.filter(f => f.state !== MatchState.Invalid);
    if (ff.length) {
      this.data.set(format.handler, ff);
    } else {
      this.data.delete(format.handler);
    }
  }
}
