import { Contents } from './contents';
import { Template } from './template';
import { FormatRange } from './formatter';
import { FormatMap } from './format-map';
import { VElement } from './element';

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

  slice(startIndex: number, endIndex: number) {
    return this.contents.slice(startIndex, endIndex);
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
