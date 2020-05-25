import { Contents } from './contents';
import { Template } from './template';
import { FormatRange, Formatter } from './formatter';
import { FormatMap } from './format-map';

export class Fragment {
  private contents = new Contents();
  private formatMap = new FormatMap();

  get contentLength() {
    return this.contents.length;
  }

  append(element: string | Template) {
    this.contents.append(element);
  }

  mergeFormat(formatter: FormatRange) {
    this.formatMap.merge(formatter);
  }

  getCanApplyFormats() {
    return this.formatMap.getCanApplyFormats();
  }

  sliceContents(startIndex: number, endIndex?: number) {
    return this.contents.slice(startIndex, endIndex);
  }

  insert(contents: Template | string, index: number) {
    this.contents.insert(contents, index);
    const newFormatRanges: FormatRange[] = [];
    this.formatMap.getFormatRanges().forEach(format => {
      if (contents instanceof Template && format.startIndex < index && format.endIndex >= index) {
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
    this.formatMap.getFormatRanges().forEach(format => {
      const cloneFormat = Object.assign({}, format);
      cloneFormat.startIndex = 0;
      if (format.startIndex <= endIndex && format.endIndex >= startIndex) {
        cloneFormat.startIndex = Math.max(format.startIndex - startIndex, 0);
        cloneFormat.endIndex = Math.min(format.endIndex - startIndex, endIndex - startIndex);
        newFragmentFormats.push(cloneFormat);
      }
      if (format.endIndex <= startIndex) {
        // 在选区之前
        formatRanges.push(format);
      } else if (format.startIndex > endIndex) {
        // 在选区这后
        format.startIndex -= length;
        format.endIndex -= length;
        formatRanges.push(format);
      } else {
        if (format.startIndex < startIndex) {
          format.endIndex = Math.max(startIndex, format.endIndex - length);
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

  find(template: Template) {
    return this.contents.find(template);
  }

  /**
   * 通过 Handler 获取当前片段的的格式化信息
   * @param formatter
   */
  getFormatRangesByFormatter(formatter: Formatter) {
    return this.formatMap.getFormatRangesByFormatter(formatter);
  }

  apply(formatRange: FormatRange) {
    const contents = this.sliceContents(formatRange.startIndex, formatRange.endIndex);
    let index = 0;
    const formats: FormatRange[] = [];
    contents.forEach(item => {
      if (item instanceof Template) {
        item.childSlots.forEach(fragment => {
          const newFormatRange = Object.assign({}, formatRange);
          newFormatRange.startIndex = 0;
          newFormatRange.endIndex = fragment.contentLength;
          fragment.apply(newFormatRange);
        })
      } else {
        formats.push({
          startIndex: formatRange.startIndex + index,
          endIndex: formatRange.endIndex + index,
          state: formatRange.state,
          abstractData: formatRange.abstractData,
          renderer: formatRange.renderer
        })
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
