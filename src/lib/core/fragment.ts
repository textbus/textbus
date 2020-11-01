import { Subscription } from 'rxjs';

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
import { AbstractData } from './abstract-data';

/**
 * 应用样式的可选参数。
 */
export interface ApplyFormatOptions {
  /** 是否作为最重要的样式，当为 true 时，新样式将会覆盖原有样式，当为 false 的时候，原有样式将会覆盖新样式 */
  important?: boolean;
  /** 是否将样式应用到子组件（Component）*/
  coverChild?: boolean;
}

/**
 * TextBus 抽象数据类
 */
export class Fragment extends AbstractData {
  /**
   * fragment 内容的长度
   */
  get contentLength() {
    return this.contents.length;
  }

  private contents = new Contents();
  private formatMap = new FormatMap();

  private eventMap = new Map<Component, Subscription>();

  constructor() {
    super();
  }

  /**
   * 用一个新的 fragment 覆盖当前 fragment。
   * @param source
   */
  from(source: Fragment) {
    this.markAsChanged();
    this.contents = source.contents;
    this.formatMap = source.formatMap;
    source.clean();
  }

  /**
   * 将新内容添加到 fragment 末尾。
   * @param content
   * @param insertAdjacentInlineFormat
   */
  append(content: string | Component, insertAdjacentInlineFormat = false) {
    const offset = content.length;
    const length = this.contentLength;
    this.contents.append(content);

    this.markAsDirtied();
    if (content instanceof Component) {
      this.eventMap.set(content, content.onChange.subscribe(() => {
        this.markAsChanged();
      }))
    }

    if (insertAdjacentInlineFormat) {
      this.getFormatKeys().forEach(token => {
        if (token instanceof InlineFormatter) {
          this.getFormatRanges(token).forEach(range => {
            if (range.endIndex === length) {
              range.endIndex += offset;
            }
          })
        }
      })
    }
  }

  /**
   * 根据下标切分出一段内容。
   * @param startIndex
   * @param endIndex
   */
  sliceContents(startIndex: number, endIndex?: number) {
    return this.contents.slice(startIndex, endIndex);
  }

  /**
   * 插入新内容到指定组件前。
   * @param contents
   * @param ref
   */
  insertBefore(contents: Component | string, ref: Component) {
    const index = this.indexOf(ref);
    if (index === -1) {
      throw new Error('引用的节点不属于当前 Fragment 的子级！');
    }
    this.insert(contents, index);
  }

  /**
   * 插入新内容到指定组件后。
   * @param contents
   * @param ref
   */
  insertAfter(contents: Component | string, ref: Component) {
    const index = this.indexOf(ref);
    if (index === -1) {
      throw new Error('引用的节点不属于当前 Fragment 的子级！');
    }
    this.insert(contents, index + 1);
  }

  /**
   * 插入新内容到指定位置。
   * @param contents
   * @param index
   */
  insert(contents: Component | string, index: number) {
    this.markAsDirtied();
    if (contents instanceof Component) {
      this.eventMap.set(contents, contents.onChange.subscribe(() => {
        this.markAsChanged();
      }))
    }

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

  /**
   * 克隆当前 fragment 的副本并返回。
   */
  clone() {
    const ff = new Fragment();
    ff.contents = this.contents.clone();
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
            return ff.contentLength;
          },
          state: f.state,
          abstractData: f.abstractData
        }
      })])
    });
    return ff;
  }

  /**
   * 清除当前 fragment 的内容及格式。
   */
  clean() {
    this.markAsDirtied();
    Array.from(this.eventMap.values()).map(i => i.unsubscribe());
    this.eventMap.clear();
    this.contents = new Contents();
    this.formatMap = new FormatMap();
  }

  /**
   * 通过下标获取文本或子节点。
   * @param index
   */
  getContentAtIndex(index: number) {
    return this.contents.getContentAtIndex(index);
  }

  /**
   * 删除指定范围的内容及格式。
   * @param startIndex
   * @param count
   */
  remove(startIndex: number, count = this.contents.length - startIndex) {
    this.cut(startIndex, count);
  }

  /**
   * 剪切指定范围的内容及格式，并返回一个新的 fragment。
   * @param startIndex
   * @param count
   */
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
    this.contents.cut(startIndex, endIndex).forEach(i => {
      fragment.append(i);
      if (i instanceof Component) {
        this.eventMap.get(i).unsubscribe();
        this.eventMap.delete(i);
      }
    });
    fragment.formatMap = discardedFormatMap;
    return fragment;
  }

  /**
   * 获取当前片段内所有的 Formatter。
   */
  getFormatKeys() {
    return Array.from(this.formatMap.keys());
  }

  /**
   * 通过 Formatter 获取所有的 FormatRange。
   * @param token
   */
  getFormatRanges(token: InlineFormatter | BlockFormatter) {
    return this.formatMap.get(token) || [];
  }

  /**
   * 查找一个组件在当前 fragment 的下标位置。
   * @param component
   */
  indexOf(component: Component) {
    return this.contents.indexOf(component);
  }

  /**
   * 给当前 fragment 应用一段新样式。
   * @param token       样式的 Formatter。
   * @param params      样式的配置参数。
   * @param options     应用样式的可选项。
   */
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
          item.forEach(fragment => {
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
