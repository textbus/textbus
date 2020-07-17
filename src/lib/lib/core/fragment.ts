import { Contents } from './contents';
import { BranchComponent, DivisionComponent, Component, BackboneComponent } from './component';
import {
  BlockFormatter,
  FormatEffect,
  InlineFormatter,
  InlineFormatParams,
  BlockFormatParams
} from './formatter';
import { FormatMap } from './format-map';

export interface ApplyFormatOptions {
  important?: boolean;
  coverChild?: boolean;
}

export class Fragment {
  private contents = new Contents();
  private formatMap = new FormatMap();

  get contentLength() {
    return this.contents.length;
  }

  from(source: Fragment) {
    this.contents = source.contents;
    this.formatMap = source.formatMap;
    source.clean();
  }

  append(element: string | Component) {
    this.contents.append(element);
  }

  sliceContents(startIndex: number, endIndex?: number) {
    return this.contents.slice(startIndex, endIndex);
  }

  insertBefore(contents: Component | string, ref: Component) {
    const index = this.indexOf(ref);
    if (index === -1) {
      throw new Error('引用的节点不属于当前 Fragment 的子级！');
    }
    this.insert(contents, index);
  }

  insertAfter(contents: Component | string, ref: Component) {
    const index = this.indexOf(ref);
    if (index === -1) {
      throw new Error('引用的节点不属于当前 Fragment 的子级！');
    }
    this.insert(contents, index + 1);
  }

  insert(contents: Component | string, index: number) {
    this.contents.insert(contents, index);
    const formatMap = new FormatMap();
    Array.from(this.formatMap.keys()).forEach(token => {
      const formats = this.formatMap.get(token) || [];
      formats.forEach(format => {

        if (token instanceof BlockFormatter) {
          formatMap.merge(token, format, true);
          return;
        }
        if (format.startIndex < index && format.endIndex >= index) {
          if (contents instanceof DivisionComponent ||
            contents instanceof BranchComponent ||
            contents instanceof BackboneComponent) {
            formatMap.merge(token, {
              ...format,
              endIndex: index
            }, true);
            formatMap.merge(token, {
              startIndex: index,
              endIndex: index + 1,
              state: FormatEffect.Invalid,
              abstractData: format.abstractData.clone(),
            }, true);
            if (format.endIndex > index) {
              formatMap.merge(token, {
                ...format,
                startIndex: index + 1,
                endIndex: format.endIndex + 1
              }, true);
            }
          } else {
            formatMap.merge(token, {
              ...format,
              endIndex: format.endIndex + contents.length
            }, true);
          }
        } else {
          if (format.startIndex >= index && format.startIndex > 0 && format.startIndex < format.endIndex) {
            format.startIndex += contents.length;
          }
          if (format.endIndex >= index) {
            format.endIndex += contents.length;
          }
          formatMap.merge(token, format, true);
        }
      })
    })
    this.formatMap = formatMap;
  }

  clone() {
    const ff = new Fragment();
    ff.contents = this.contents.clone();
    const self = this;
    Array.from(this.formatMap.keys()).forEach(token => {
      ff.formatMap.set(token, [...this.formatMap.get(token).map(f => {
        return token instanceof InlineFormatter ? {
          ...f,
          abstractData: f.abstractData?.clone()
        } : {
          get startIndex() {
            return 0;
          },
          get endIndex() {
            return self.contentLength;
          },
          state: f.state,
          abstractData: f.abstractData
        }
      })])
    });
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

  remove(startIndex: number, count = this.contents.length - startIndex) {
    this.cut(startIndex, count);
  }

  cut(startIndex: number, count = this.contents.length - startIndex) {
    const endIndex = startIndex + count;
    const selfFormatMap = new FormatMap();
    const discardedFormatMap = new FormatMap();

    Array.from(this.formatMap.keys()).forEach(token => {
      const formats = this.formatMap.get(token);
      if (token instanceof BlockFormatter) {
        selfFormatMap.set(token, [...formats]);
        discardedFormatMap.set(token, [...formats]);
        return;
      }
      formats.forEach(format => {
        // 在之前
        // formatRange  ________-------________
        // deleteRange     [  ]
        if (format.startIndex >= endIndex) {
          selfFormatMap.merge(token, {
            ...format,
            startIndex: format.startIndex - count,
            endIndex: format.endIndex - count
          }, true);
          return;
        }
        // 在之后
        // formatRange  ________-------________
        // deleteRange                  [  ]
        if (format.endIndex <= startIndex) {
          selfFormatMap.merge(token, {...format}, true);
          return;
        }

        // 前交
        // formatRange  ________-------________
        // deleteRange        [   ]

        if (format.startIndex > startIndex &&
          format.startIndex < endIndex &&
          format.endIndex >= endIndex) {
          selfFormatMap.merge(token, {
            ...format,
            startIndex,
            endIndex: format.endIndex - count
          }, true);
          discardedFormatMap.merge(token, {
            ...format,
            startIndex: format.startIndex - startIndex,
            endIndex: count
          }, true);
          return;
        }

        // 重叠
        // formatRange  ________-------________
        // deleteRange           [   ]

        if (format.startIndex <= startIndex && format.endIndex >= endIndex) {
          if (format.endIndex - count > format.startIndex) {
            selfFormatMap.merge(token, {
              ...format,
              endIndex: format.endIndex - count
            }, true);
          }
          discardedFormatMap.merge(token, {
            ...format,
            startIndex: 0,
            endIndex: count
          }, true);
          return;
        }

        // 后交
        // formatRange  ________-------________
        // deleteRange               [   ]
        if (format.startIndex <= startIndex && format.endIndex > startIndex && format.endIndex < endIndex) {
          selfFormatMap.merge(token, {
            ...format,
            endIndex: startIndex
          }, true);
          discardedFormatMap.merge(token, {
            ...format,
            startIndex: 0,
            endIndex: format.endIndex - startIndex
          }, true)
          return;
        }

        // 包含
        // formatRange  ________-------________
        // deleteRange        [         ]
        if (format.startIndex > startIndex && format.endIndex < endIndex) {
          discardedFormatMap.merge(token, {
            ...format,
            startIndex: format.startIndex - startIndex,
            endIndex: format.endIndex - startIndex
          }, true);
        }
      })
    })
    this.formatMap = selfFormatMap;
    const fragment = new Fragment()
    this.contents.cut(startIndex, endIndex).forEach(i => fragment.append(i));
    fragment.formatMap = discardedFormatMap;
    return fragment;
  }

  /**
   * 获取当前片段内所有的格式化信息
   */
  getFormatKeys() {
    return Array.from(this.formatMap.keys());
  }

  getFormatRanges(token: InlineFormatter | BlockFormatter) {
    return this.formatMap.get(token) || [];
  }

  indexOf(component: Component) {
    return this.contents.indexOf(component);
  }

  apply(token: InlineFormatter, params: InlineFormatParams, options?: ApplyFormatOptions): void;
  apply(token: BlockFormatter, params: BlockFormatParams, options?: ApplyFormatOptions): void;
  apply(token: InlineFormatter | BlockFormatter,
        params: InlineFormatParams | BlockFormatParams,
        options: ApplyFormatOptions = {
          important: true,
          coverChild: true
        }) {
    const {coverChild, important} = options;
    if (token instanceof BlockFormatter) {
      let self = this;
      this.formatMap.merge(token, {
        ...params,
        get startIndex() {
          return 0;
        },
        get endIndex() {
          return self.contentLength;
        }
      }, important);
      return;
    }
    const formatRange = params as InlineFormatParams;
    const contents = this.sliceContents(formatRange.startIndex, formatRange.endIndex);
    let index = 0;
    const cacheFormats: Array<{ token: InlineFormatter, params: InlineFormatParams }> = [];
    let newFormat: InlineFormatParams;
    contents.forEach(item => {
      if (item instanceof DivisionComponent) {
        newFormat = null;
        if (coverChild) {
          const newFormatRange = Object.assign({}, formatRange);
          newFormatRange.startIndex = 0;
          newFormatRange.endIndex = item.slot.contentLength;
          item.slot.apply(token, newFormatRange, options);
        }
      } else if (item instanceof BranchComponent) {
        newFormat = null;
        if (coverChild) {
          item.slots.forEach(fragment => {
            const newFormatRange = Object.assign({}, formatRange);
            newFormatRange.startIndex = 0;
            newFormatRange.endIndex = fragment.contentLength;
            fragment.apply(token, newFormatRange, options);
          })
        }
      } else if (item instanceof BackboneComponent) {
        newFormat = null;
        if (coverChild) {
          for (const fragment of item) {
            const newFormatRange = Object.assign({}, formatRange);
            newFormatRange.startIndex = 0;
            newFormatRange.endIndex = fragment.contentLength;
            fragment.apply(token, newFormatRange, options);
          }
        }
      } else {
        if (!newFormat) {
          newFormat = {
            startIndex: formatRange.startIndex + index,
            endIndex: formatRange.startIndex + index + item.length,
            state: formatRange.state,
            abstractData: formatRange.abstractData
          };
          cacheFormats.push({
            token,
            params: newFormat
          })
        } else {
          newFormat.endIndex = formatRange.startIndex + index + item.length;
        }
      }
      index += item.length;
    });
    cacheFormats.forEach(f => this.formatMap.merge(f.token, f.params, important));
  }
}
