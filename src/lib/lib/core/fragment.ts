import { Contents } from './contents';
import { MediaTemplate, Template } from './template';
import { BlockFormatter, FormatDelta, FormatRange, InlineFormatter } from './formatter';
import { FormatMap } from './format-map';

export class Fragment {
  private contents = new Contents();
  private formatMap = new FormatMap();

  get contentLength() {
    return this.contents.length;
  }

  append(element: string | Template | MediaTemplate) {
    this.contents.append(element);
  }

  mergeFormat(format: FormatDelta) {
    if (format.renderer instanceof InlineFormatter) {
      this.formatMap.merge(format as FormatRange);
    } else {
      let self = this;
      this.formatMap.merge({
        get startIndex() {
          return 0;
        },
        get endIndex() {
          return self.contentLength;
        },
        renderer: format.renderer,
        abstractData: format.abstractData,
        state: format.state
      })
    }
  }

  getCanApplyFormats() {
    return this.formatMap.getCanApplyFormats();
  }

  sliceContents(startIndex: number, endIndex?: number) {
    return this.contents.slice(startIndex, endIndex);
  }

  insert(contents: Template | MediaTemplate | string, index: number) {
    this.contents.insert(contents, index);
    const newFormatRanges: FormatRange[] = [];
    this.formatMap.getFormatRanges().forEach(format => {
      if (format.renderer instanceof BlockFormatter) {
        newFormatRanges.push(format);
        return;
      }
      if (format.startIndex < index && format.endIndex >= index) {
        newFormatRanges.push({
          startIndex: format.startIndex,
          endIndex: format.endIndex + contents.length,
          state: format.state,
          abstractData: format.abstractData.clone(),
          renderer: format.renderer
        });
      } else {
        if (format.startIndex >= index && format.startIndex > 0 && format.startIndex < format.endIndex) {
          format.startIndex += contents.length;
        }
        if (format.endIndex >= index) {
          format.endIndex += contents.length;
        }
      }
    })
    newFormatRanges.forEach(f => {
      this.mergeFormat(f);
    });
  }

  clone() {
    const ff = new Fragment();
    ff.contents = this.contents.clone();
    this.formatMap.getFormatRanges().forEach(formatRange => {
      ff.mergeFormat(formatRange.renderer instanceof InlineFormatter ? Object.assign({}, formatRange) : {
        state: formatRange.state,
        abstractData: formatRange.abstractData,
        renderer: formatRange.renderer
      });
    })
    return ff;
  }

  clean() {
    this.contents = new Contents();
    this.formatMap = new FormatMap();
  }

  /**
   * 通过下标获取文本或子节点
   * @param index
   */
  getContentAtIndex(index: number) {
    return this.contents.getContentAtIndex(index);
  }

  delete(startIndex: number, count = this.contents.length - startIndex) {
    const endIndex = startIndex + count;
    const formatMap = new FormatMap();

    const selfFormats: FormatRange[] = [];
    const discardedFormats: FormatRange[] = [];
    this.formatMap.getFormatRanges().filter(f => {
      if (f.renderer instanceof BlockFormatter) {
        selfFormats.push(Object.assign({}, f));
        discardedFormats.push(Object.assign({}, f));
        return false;
      }
      return true;
    }).forEach(format => {
      // 在之前
      if (format.endIndex <= startIndex) {
        selfFormats.push(Object.assign({}, format));
        return;
      }
      // 在之后
      if (format.startIndex >= endIndex) {
        selfFormats.push({
          ...format,
          startIndex: format.startIndex - count,
          endIndex: format.endIndex - count
        });
        return;
      }

      if (format.startIndex <= startIndex) {
        const cloneFormat = {
          ...format,
          endIndex: format.endIndex - count
        };

        if (cloneFormat.startIndex < cloneFormat.endIndex) {
          selfFormats.push(cloneFormat);
        }
        if (endIndex - format.startIndex > 0) {
          discardedFormats.push({
            ...format,
            startIndex: 0,
            endIndex: endIndex - format.startIndex
          });
        }
      } else {
        const cloneFormat = {
          ...format,
          startIndex: Math.max(startIndex, format.startIndex - count),
          endIndex: format.endIndex - count
        };
        if (cloneFormat.startIndex < cloneFormat.endIndex) {
          selfFormats.push(cloneFormat);
        }
        const s = Math.max(format.startIndex - count, startIndex);
        const e = format.endIndex - count;
        if (e > s) {
          discardedFormats.push({
            ...format,
            startIndex: 0,
            endIndex: e - s
          })
        }
      }
    })
    selfFormats.forEach(f => {
      formatMap.merge(f);
    });
    this.formatMap = formatMap;
    return {
      formatRanges: discardedFormats,
      contents: this.contents.delete(startIndex, endIndex)
    };
  }

  /**
   * 获取当前片段内所有的格式化信息
   */
  getFormatRanges() {
    return this.formatMap.getFormatRanges();
  }

  indexOf(template: Template | MediaTemplate) {
    return this.contents.indexOf(template);
  }

  /**
   * 通过 Handler 获取当前片段的的格式化信息
   * @param formatter
   */
  getFormatRangesByFormatter(formatter: InlineFormatter | BlockFormatter) {
    return this.formatMap.getFormatRangesByFormatter(formatter);
  }

  apply(f: FormatDelta) {
    if (f.renderer instanceof BlockFormatter) {
      this.mergeFormat(f);
      return;
    }
    const formatRange = f as FormatRange;
    const contents = this.sliceContents(formatRange.startIndex, formatRange.endIndex);
    let index = 0;
    const formats: FormatRange[] = [];
    let newFormat: FormatRange;
    contents.forEach(item => {
      if (item instanceof Template) {
        newFormat = null;
        item.childSlots.forEach(fragment => {
          const newFormatRange = Object.assign({}, formatRange);
          newFormatRange.startIndex = 0;
          newFormatRange.endIndex = fragment.contentLength;
          fragment.apply(newFormatRange);
        })
      } else {
        if (!newFormat) {
          newFormat = {
            startIndex: formatRange.startIndex + index,
            endIndex: formatRange.startIndex + index + item.length,
            state: formatRange.state,
            abstractData: formatRange.abstractData,
            renderer: formatRange.renderer
          };
          formats.push(newFormat)
        } else {
          newFormat.endIndex = formatRange.startIndex + index + item.length;
        }
      }
      index += item.length;
    });
    formats.forEach(f => this.formatMap.merge(f));
  }
}
