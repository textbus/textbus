import { Subscription } from 'rxjs';
import { Type } from '@tanbo/di';

import { Contents } from './contents';
import {
  BranchAbstractComponent,
  DivisionAbstractComponent,
  AbstractComponent,
  BackboneAbstractComponent,
  parentFragmentAccessToken
} from './component';
import {
  BlockFormatter,
  FormatEffect,
  InlineFormatter,
  InlineFormatParams,
  BlockFormatParams
} from './formatter';
import { FormatMap } from './format-map';
import { Marker } from './marker';
import { makeError } from '../_utils/make-error';

/**
 * 应用样式的可选参数。
 */
export interface ApplyFormatOptions {
  /** 是否作为最重要的样式，当为 true 时，新样式将会覆盖原有样式，当为 false 的时候，原有样式将会覆盖新样式 */
  important?: boolean;
  /** 是否将样式应用到子组件（Component）*/
  coverChild?: boolean;
}

export const parentComponentAccessToken = Symbol('ParentComponentAccessToken');

const fragmentErrorFn = makeError('Fragment');

/**
 * TextBus 抽象数据类
 */
export class Fragment extends Marker {
  [parentComponentAccessToken]: DivisionAbstractComponent | BranchAbstractComponent | BackboneAbstractComponent | null = null;

  get parentComponent() {
    return this[parentComponentAccessToken];
  }

  /**
   * fragment 内容的长度
   */
  get contentLength() {
    return this.contents.length;
  }

  private contents = new Contents();
  private formatMap = new FormatMap();

  private eventMap = new Map<AbstractComponent, Subscription>();

  constructor() {
    super();
  }

  /**
   * 用一个新的 fragment 覆盖当前 fragment。
   * @param source
   */
  from(source: Fragment) {
    this._clean();
    const self = this;
    Array.from(source.formatMap.keys()).forEach(token => {
      this.formatMap.set(token, [...source.formatMap.get(token).map(f => {
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

    source.contents.slice(0).forEach(c => {
      this.contents.append(c);
      if (c instanceof AbstractComponent) {
        c[parentFragmentAccessToken] = this;
        this.eventMap.set(c, c.onChange.subscribe(() => {
          this.markAsChanged();
        }))
      }
    })
    source.clean();
    this.markAsDirtied();
  }

  /**
   * 合并两个可编辑片段的内容数组。
   * @param fragment 
   */
  concate(fragment: Fragment) {
    const index = this.contentLength;

    fragment.sliceContents(0).forEach(c => {
      this.contents.append(c);
      if (c instanceof AbstractComponent) {
        c[parentFragmentAccessToken] = this;
        this.eventMap.set(c, c.onChange.subscribe(() => {
          this.markAsChanged();
        }))
      }
    });
    fragment.getFormatKeys().filter(token => !(token instanceof BlockFormatter)).forEach(token => {
      const formats = fragment.getFormatRanges(token) || [];
      formats.forEach(f => {
        f.startIndex += index;
        f.endIndex += index;
        this._apply(token, f);
      })
    })
    fragment.clean();
    this.markAsDirtied();
  }

  /**
   * 将新内容添加到 fragment 末尾。
   * @param content
   * @param insertAdjacentInlineFormat
   */
  append(content: string | AbstractComponent, insertAdjacentInlineFormat = false) {
    this._append(content, insertAdjacentInlineFormat);
    this.markAsDirtied();
  }

  /**
   * 根据下标切分出一段内容。
   * @param startIndex
   * @param endIndex
   */
  sliceContents(startIndex = 0, endIndex?: number) {
    return this.contents.slice(startIndex, endIndex);
  }

  /**
   * 插入新内容到指定组件前。
   * @param contents
   * @param ref
   */
  insertBefore(contents: AbstractComponent | string, ref: AbstractComponent) {
    const index = this.indexOf(ref);
    if (index === -1) {
      throw fragmentErrorFn('component referenced is not a member of the current editable fragment');
    }
    this.insert(contents, index);
  }

  /**
   * 插入新内容到指定组件后。
   * @param contents
   * @param ref
   */
  insertAfter(contents: AbstractComponent | string, ref: AbstractComponent) {
    const index = this.indexOf(ref);
    if (index === -1) {
      throw fragmentErrorFn('component referenced is not a member of the current editable fragment');
    }
    this.insert(contents, index + 1);
  }

  /**
   * 插入新内容到指定位置。
   * @param contents
   * @param index
   */
  insert(contents: AbstractComponent | string, index: number) {
    if (contents instanceof AbstractComponent) {
      this.gourdComponentInSelf(contents);
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
          if (contents instanceof DivisionAbstractComponent ||
            contents instanceof BranchAbstractComponent ||
            contents instanceof BackboneAbstractComponent) {
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
    this.markAsDirtied();
  }

  /**
   * 克隆当前 fragment 的副本并返回。
   */
  clone() {
    const ff = new Fragment();
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
    this.contents.clone().slice(0).forEach(i => ff.append(i));
    return ff;
  }

  /**
   * 清除当前 fragment 的内容及格式。
   */
  clean() {
    this._clean();
    this.markAsDirtied();
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
    this.cut(startIndex, count).sliceContents().forEach(i => {
      if (i instanceof AbstractComponent) {
        i[parentFragmentAccessToken] = null;
      }
    });
  }

  /**
   * 剪切指定范围的内容及格式，并返回一个新的 fragment。
   * @param startIndex
   * @param count
   */
  cut(startIndex: number, count = this.contents.length - startIndex) {
    const fragment = new Fragment()
    if (count <= 0) {
      return fragment;
    }
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
    this.contents.cut(startIndex, endIndex).forEach(i => {
      fragment.append(i);
      if (i instanceof AbstractComponent) {
        this.eventMap.get(i).unsubscribe();
        this.eventMap.delete(i);
      }
    });
    fragment.formatMap = discardedFormatMap;
    this.markAsDirtied();
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
  indexOf(component: AbstractComponent) {
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
  apply(token: any, params: any, options: ApplyFormatOptions = {
    important: true,
    coverChild: true
  }) {
    this._apply(token, params, options);
    this.markAsDirtied();
  }

  /**
   * 根据 fragment，向上查找最近的某类组件实例。
   * @param context 指定组件的构造类。
   * @param filter  过滤函数，当查找到实例后，可在 filter 函数中作进一步判断，如果返回为 false，则继续向上查找。
   */
  getContext<T extends AbstractComponent>(context: Type<T>, filter?: (instance: T) => boolean): T {
    const componentInstance = this.parentComponent;
    if (!componentInstance) {
      return null;
    }
    if (componentInstance instanceof context) {
      if (typeof filter === 'function') {
        if (filter(componentInstance)) {
          return componentInstance;
        }
      } else {
        return componentInstance;
      }
    }
    const parentFragment = componentInstance.parentFragment;
    if (!parentFragment) {
      return null;
    }
    return parentFragment.getContext(context, filter);
  }

  private _apply(token: InlineFormatter, formatRange: InlineFormatParams, options?: ApplyFormatOptions): void;
  private _apply(token: BlockFormatter, formatRange: BlockFormatParams, options?: ApplyFormatOptions): void;
  private _apply(token: any, formatRange: any, options: ApplyFormatOptions = {
    important: true,
    coverChild: true
  }) {
    const {coverChild, important} = options;
    if (token instanceof BlockFormatter) {
      const self = this;
      this.formatMap.merge(token, {
        ...formatRange,
        get startIndex() {
          return 0;
        },
        get endIndex() {
          return self.contentLength;
        }
      }, important);
      return;
    }
    if (formatRange.startIndex < 0) {
      formatRange.startIndex = 0;
    }
    if (formatRange.endIndex > this.contentLength) {
      formatRange.endIndex = this.contentLength;
    }
    const contents = this.sliceContents(formatRange.startIndex, formatRange.endIndex);
    let index = 0;
    const cacheFormats: Array<{ token: InlineFormatter, params: InlineFormatParams }> = [];
    let newFormat: InlineFormatParams;
    contents.forEach(item => {
      if (item instanceof DivisionAbstractComponent) {
        newFormat = null;
        if (coverChild) {
          const newFormatRange = Object.assign({}, formatRange);
          newFormatRange.startIndex = 0;
          newFormatRange.endIndex = item.slot.contentLength;
          item.slot.apply(token, newFormatRange, options);
        }
      } else if (item instanceof BranchAbstractComponent) {
        newFormat = null;
        if (coverChild) {
          item.slots.forEach(fragment => {
            const newFormatRange = Object.assign({}, formatRange);
            newFormatRange.startIndex = 0;
            newFormatRange.endIndex = fragment.contentLength;
            fragment.apply(token, newFormatRange, options);
          })
        }
      } else if (item instanceof BackboneAbstractComponent) {
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

  private _append(content: string | AbstractComponent, insertAdjacentInlineFormat = false) {
    const offset = content.length;
    const length = this.contentLength;
    this.contents.append(content);

    if (content instanceof AbstractComponent) {
      this.gourdComponentInSelf(content);
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

  private _clean() {
    Array.from(this.eventMap.values()).map(i => i.unsubscribe());
    this.eventMap.clear();
    this.sliceContents().forEach(i => {
      if (i instanceof AbstractComponent && i[parentFragmentAccessToken] === this) {
        i[parentFragmentAccessToken] = null;
      }
    })
    this.contents = new Contents();
    this.formatMap = new FormatMap();
  }

  private gourdComponentInSelf(component: AbstractComponent) {
    const parentFragment = component.parentFragment;
    if (parentFragment) {
      const index = parentFragment.indexOf(component);
      parentFragment.remove(index, 1);
    }
    component[parentFragmentAccessToken] = this;
  }
}
