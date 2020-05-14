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
