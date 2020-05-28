import { Contents } from './contents';
import { MediaTemplate, Template } from './template';
import { BlockFormatter, FormatDelta, FormatRange, InlineFormatter } from './formatter';
import { FormatMap } from './format-map';
import { BlockStyleFormatter } from '../formatter/block-style.formatter';

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
        ...format
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
      if (contents instanceof Template &&
        format.startIndex < index && format.endIndex >= index) {
        newFormatRanges.push({
          startIndex: index + 1,
          endIndex: format.endIndex + 1,
          state: format.state,
          abstractData: format.abstractData.clone(),
          renderer: format.renderer
        });
        format.endIndex = index;
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
      ff.mergeFormat(Object.assign({}, formatRange));
    })
    return ff;
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

    const formatRanges: FormatRange[] = [];
    const newFragmentFormats: FormatRange[] = [];
    this.formatMap.getFormatRanges().filter(f => {
      if (f.renderer instanceof BlockStyleFormatter) {
        newFragmentFormats.push(Object.assign({}, f));
        return false;
      }
      return true;
    }).forEach(format => {
      if (format.startIndex <= endIndex && format.endIndex >= startIndex) {
        const cloneFormat = Object.assign({}, format);
        cloneFormat.startIndex = Math.max(format.startIndex - startIndex, 0);
        cloneFormat.endIndex = Math.min(format.endIndex - startIndex, endIndex - startIndex);
        newFragmentFormats.push(cloneFormat);
      }
      if (format.endIndex <= startIndex) {
        // 在选区之前
        formatRanges.push(format);
      } else if (format.startIndex > endIndex) {
        // 在选区这后
        format.startIndex -= count;
        format.endIndex -= count;
        formatRanges.push(format);
      } else {
        if (format.startIndex < startIndex) {
          format.endIndex = Math.max(startIndex, format.endIndex - count);
          formatRanges.push(format);
        } else if (format.endIndex > endIndex) {
          format.startIndex = startIndex;
          format.endIndex = startIndex + format.endIndex - endIndex;
          formatRanges.push(format);
        } else if (format.startIndex === 0 && startIndex === 0) {
          format.startIndex = format.endIndex = 0;
          formatRanges.push(format);
        }
      }
    })
    formatRanges.forEach(f => {
      formatMap.merge(f);
    });
    this.formatMap = formatMap;
    return {
      formatRanges: newFragmentFormats,
      contents: this.contents.delete(startIndex, endIndex)
    };
  }

  /**
   * 获取当前片段内所有的格式化信息
   */
  getFormatRanges() {
    return this.formatMap.getFormatRanges();
  }

  find(template: Template | MediaTemplate) {
    return this.contents.find(template);
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


  // clone(options: { contents?: boolean, formats?: boolean } = {}) {
  //   const fragment = new Fragment();
  //
  //   if (options.contents) {
  //     this.contents.slice(0).forEach(item => {
  //       if (typeof item === 'string') {
  //         fragment.append(item);
  //       } else {
  //         fragment.append(item);
  //       }
  //     })
  //   }
  //
  //   return fragment;
  // }
}
