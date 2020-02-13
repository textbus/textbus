import { Contents } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { ViewData } from './view-data';
import { Priority } from '../toolbar/help';
import { BlockFormat, FormatRange, InlineFormat, SingleFormat } from './format';
import { Single } from './single';
import { BlockToken, InlineToken, MediaToken, Token, TextToken } from '../renderer/tokens';
import { FormatDelta } from './parser';
import { FormatMap } from './format-map';

export class Fragment extends ViewData {
  readonly token: BlockToken;
  readonly parent: Fragment;

  /**
   * 当前片段内容的长度
   */
  get contentLength() {
    return this.contents.length;
  }

  /**
   * 当前片段的格式化数据
   */
  private formatMap = new FormatMap();
  /**
   * 当前片段的内容
   */
  private contents = new Contents();

  /**
   * 当前片段的格式化信息
   * @param formats
   */
  constructor(formats?: FormatDelta[]) {
    super();
    if (Array.isArray(formats)) {
      formats.forEach(item => {
        this.formatMap.setFormats(item.handler, [new BlockFormat({
          ...item,
          context: this
        })])
      })
    }
  }

  /**
   * 通过 Handler 获取当前片段的的格式化信息
   * @param handler
   */
  getFormatRangesByHandler(handler: Handler) {
    return this.formatMap.getFormatRangesByHandler(handler);
  }

  /**
   * 获取当前片段内所有的 Handler
   */
  getFormatHandlers() {
    return this.formatMap.getFormatHandlers();
  }

  /**
   * 获取当前片段内所有的格式化信息
   */
  getFormatRanges() {
    return this.formatMap.getFormatRanges();
  }

  /**
   * 通过 Handler 设置一组格式化数据
   * @param key
   * @param formatRanges
   */
  setFormats(key: Handler, formatRanges: FormatRange[]) {
    this.formatMap.setFormats(key, formatRanges.map(f => {
      f.context = this;
      return f;
    }));
  }

  /**
   * 合并一组格式化数据
   * @param states 格式化数据
   * @param startIndex inlineFormat 的格式化范围起始下标
   * @param endIndex inlineFormat 的格式化范围结束下标
   * @param canSurroundBlockElement 是否可以包含块级节点
   */
  mergeMatchStates(states: FormatDelta[], startIndex: number, endIndex: number, canSurroundBlockElement: boolean) {
    states.forEach(state => {
      if ([Priority.Default, Priority.Block, Priority.BlockStyle].includes(state.handler.priority)) {
        this.apply(new BlockFormat({
          ...state,
          context: this
        }), canSurroundBlockElement);
      } else {
        this.apply(new InlineFormat({
          ...state,
          context: this,
          startIndex,
          endIndex
        }), canSurroundBlockElement);
      }
    });
  }

  /**
   * 清除当前片段的所有格式
   */
  cleanFormats() {
    this.formatMap.clear();
    this.markDirty(true);
  }

  // splitFormatRange(handler: Handler, index: number) {
  //   const formats = this.formatMap.get(handler).filter(f => f instanceof InlineFormat) as InlineFormat[];
  //   const newFormats: InlineFormat[] = [];
  //   formats.forEach(format => {
  //     if (format.startIndex < index && format.endIndex >= index) {
  //       const c = format.clone();
  //       if (format.endIndex === index) {
  //         c.greedy = false;
  //         newFormats.push(c);
  //         return;
  //       }
  //       c.endIndex = index;
  //       c.greedy = false;
  //       newFormats.push(c);
  //       const e = format.clone();
  //       e.startIndex = index;
  //       newFormats.push(e);
  //     }
  //   });
  //   if (newFormats.length) {
  //     this.formatMap.set(handler, newFormats);
  //   }
  // }

  /**
   * 给当前片段应用新一格式
   * @param formats
   */
  useFormats(formats: Map<Handler, Array<BlockFormat | InlineFormat>>) {
    this.markDirty();

    this.formatMap = new FormatMap();
    Array.from(formats.keys()).forEach(key => {
      this.formatMap.setFormats(key, formats.get(key).map(i => {
        i.context = this;
        return i.clone();
      }));
    });
  }

  /**
   * 获取当前片段格式化信息的副本
   */
  getFormatMap() {
    const formatMap = new Map<Handler, Array<BlockFormat | InlineFormat>>();
    Array.from(this.formatMap.getFormatHandlers()).forEach(key => {
      formatMap.set(key, this.formatMap.getFormatRangesByHandler(key).map(i => {
        const c = i.clone();
        c.context = null;
        return c;
      }));
    });
    return formatMap;
  }

  /**
   * 合并一段格式
   * @param format
   * @param important
   */
  mergeFormat(format: FormatRange, important = false) {
    this.markDirty();
    format.context = this;
    this.formatMap.mergeFormat(format, important);
  }

  /**
   * 克隆当前片段的副本
   */
  clone(): Fragment {
    const ff = new Fragment();
    ff.contents = this.contents.clone();
    ff.contents.slice(0).filter(item => {
      if (item instanceof Single || item instanceof Fragment) {
        (<{ parent: Fragment }>item.parent) = ff;
      }
    });
    ff.formatMap = new FormatMap();
    Array.from(this.formatMap.getFormatHandlers()).forEach(key => {
      ff.formatMap.setFormats(key, this.formatMap.getFormatRangesByHandler(key).map(f => {
        const c = f.clone();
        c.context = ff;
        return c;
      }));
    });
    return ff;
  }

  /**
   * 用新的内容覆盖当前片段的内容
   * @param contents
   */
  useContents(contents: Contents) {
    this.markDirty();
    this.contents = contents;
    contents.slice(0).forEach(i => {
      if (i instanceof Single || i instanceof Fragment) {
        (<{ parent: Fragment }>i.parent) = this;
      }
    });
  }

  /**
   * 从当前片段内切分出一段内容
   * @param startIndex
   * @param endIndex
   */
  sliceContents(startIndex: number, endIndex?: number) {
    return this.contents.slice(startIndex, endIndex);
  }

  /**
   * 给当前片段应用新的格式
   * @param format 新格式的应用范围
   * @param canSurroundBlockElement 是否可以包含块级节点，如 strong 不可以包含 p，则应传入 false
   */
  apply(format: InlineFormat | BlockFormat, canSurroundBlockElement: boolean) {
    this.markDirty();

    if (canSurroundBlockElement) {
      this.mergeFormat(format, true);
    } else {
      const children = this.contents.slice(format.startIndex, format.endIndex);
      let index = 0;
      const formats: Array<InlineFormat | BlockFormat> = [];
      let childFormat: InlineFormat | BlockFormat;
      children.forEach(item => {
        if (item instanceof Fragment) {
          const c = format.clone();
          if (c instanceof InlineFormat) {
            c.startIndex = 0;
            c.endIndex = item.contentLength;
          }
          item.apply(c, canSurroundBlockElement);
        } else if (item) {
          if (!childFormat) {
            childFormat = format instanceof InlineFormat ? new InlineFormat({
              startIndex: format.startIndex + index,
              endIndex: format.startIndex + index + item.length,
              handler: format.handler,
              context: this,
              state: format.state,
              abstractData: format.abstractData
            }) : new BlockFormat({
              ...format
            });
            formats.push(childFormat);
          } else if (format instanceof InlineFormat) {
            (<InlineFormat>childFormat).endIndex = format.startIndex + index + item.length;
          }
        }
        index += item.length;
      });
      formats.forEach(f => this.mergeFormat(f, true))
    }
  }

  /**
   * 在当前片段的指定位置插入内容
   * @param content
   * @param index
   */
  insert(content: string | ViewData, index: number) {
    this.markDirty();
    if (content instanceof Single || content instanceof Fragment) {
      if (content.parent) {
        const index = content.parent.find(content);
        content.parent.delete(index, index + 1);
      }
      (<{ parent: Fragment }>content.parent) = this;
    }
    this.contents.insert(content, index);
    const newFormats: InlineFormat[] = [];
    Array.from(this.formatMap.getFormatHandlers()).forEach(key => {
      const formats = this.formatMap.getFormatRangesByHandler(key).filter(format => {
        return format instanceof InlineFormat || format instanceof SingleFormat;
      });

      // const collapsedFormat = formats.filter(f => {
      //   return f.startIndex === f.endIndex && f.startIndex === index;
      // })[0];

      formats.forEach((format: InlineFormat) => {
        if (content instanceof Fragment && format.startIndex < index && format.endIndex >= index) {
          newFormats.push(new InlineFormat({
            startIndex: index + 1,
            endIndex: format.endIndex + 1,
            state: format.state,
            handler: format.handler,
            context: this,
            abstractData: format.abstractData.clone()
          }));
          format.endIndex = index;
        } else {
          if (format.startIndex >= index && format.startIndex > 0 && format.startIndex < format.endIndex) {
            format.startIndex += content.length;
          }
          if (format.endIndex >= index) {
            format.endIndex += content.length;
          }
        }
      })
    });
    newFormats.forEach(f => {
      this.mergeFormat(f, true);
    });
  }

  /**
   * 在当前片段的最后增加内容
   * @param content
   * @param insertAdjacentInlineFormat
   */
  append(content: string | ViewData, insertAdjacentInlineFormat = false) {
    this.markDirty();

    if (content instanceof Single || content instanceof Fragment) {
      if (content.parent) {
        const index = content.parent.find(content);
        if (index > -1) {
          content.parent.delete(index, index + 1);
        }
      }
      (<{ parent: Fragment }>content.parent) = this;
    }

    this.contents.append(content);
    if (insertAdjacentInlineFormat) {
      this.formatMap.getFormatRanges().filter(format => {
        return [Priority.Property, Priority.Inline].includes(format.handler.priority);
      }).forEach((format: InlineFormat) => {
        format.endIndex += content.length;
      })
    }
  }

  /**
   * 通过下标在当前片段获取指定位置的内容
   * @param index
   */
  getContentAtIndex(index: number) {
    return this.contents.getContentAtIndex(index);
  }

  /**
   * 查找一个节点在当前片段内的下标位置，如未找到，则返回 -1
   * @param el
   */
  find(el: ViewData) {
    return this.contents.find(el);
  }

  /**
   * 把一个片段的内容及格式插入到当前片段的指定位置
   * @param fragment
   * @param index
   */
  insertFragmentContents(fragment: Fragment, index: number) {
    this.markDirty();
    const contentsLength = fragment.contents.length;
    const elements = fragment.contents.slice(0).map(content => {
      if (content instanceof Single || content instanceof Fragment) {
        (<{ parent: Fragment }>content.parent) = this;
      }
      return content;
    });
    this.contents.insertElements(elements, index);
    Array.from(this.formatMap.getFormatHandlers()).filter(key => {
      return [Priority.Inline, Priority.Property].includes(key.priority);
    }).forEach(key => {
      const formatRanges = this.formatMap.getFormatRangesByHandler(key).filter(f => f instanceof InlineFormat) as InlineFormat[];
      const newRanges: InlineFormat[] = [];
      formatRanges.forEach(format => {
        if (format.startIndex < index && format.endIndex > index) {
          const f = format.clone();
          f.startIndex = index;
          format.endIndex = index;
          newRanges.push(format, f);
        } else {
          newRanges.push(format);
        }
      });
      newRanges.forEach(format => {
        if (format.startIndex === index) {
          format.startIndex += contentsLength;
          format.endIndex += contentsLength;
        }
      });
      this.formatMap.setFormats(key, newRanges);
    });

    Array.from(fragment.formatMap.getFormatHandlers()).filter(key => {
      return [Priority.Inline, Priority.Property].includes(key.priority);
    }).forEach(key => {
      const formatRanges = fragment.formatMap.getFormatRangesByHandler(key).filter(f => f instanceof InlineFormat) as InlineFormat[];
      formatRanges.forEach(format => {
        const c = format.clone();
        c.startIndex += index;
        c.endIndex += index;
        this.mergeFormat(c, true);
      });
    });
    fragment.cleanFormats();
    fragment.useContents(new Contents());
  }

  /**
   * 删除一段内容，并返回删除的片段
   * @param startIndex
   * @param endIndex
   */
  delete(startIndex: number, endIndex = this.contents.length) {
    const ff = new Fragment(null);
    if (endIndex < startIndex || startIndex < 0) {
      return ff;
    }
    this.markDirty();
    this.contents.delete(startIndex, endIndex).forEach(item => {
      if (typeof item === 'string') {
        ff.append(item);
      } else if (item instanceof Single || item instanceof Fragment) {
        ff.append(item);
      }
    });
    const formatMap = new FormatMap();

    Array.from(this.formatMap.getFormatHandlers()).forEach(key => {
      const formats: Array<InlineFormat | BlockFormat> = [];
      const newFragmentFormats: Array<InlineFormat | BlockFormat> = [];
      this.formatMap.getFormatRangesByHandler(key).forEach(format => {
        if (format instanceof BlockFormat) {
          const c = format.clone();
          c.context = ff;
          newFragmentFormats.push(c);
          formats.push(format);
        } else {
          const cloneFormat = format.clone();
          cloneFormat.context = ff;
          cloneFormat.startIndex = 0;
          if (format.startIndex <= endIndex && format.endIndex >= startIndex) {
            cloneFormat.startIndex = Math.max(format.startIndex - startIndex, 0);
            cloneFormat.endIndex = Math.min(format.endIndex - startIndex, ff.contents.length);
            newFragmentFormats.push(cloneFormat);
          }
          if (format.endIndex <= startIndex) {
            // 在选区之前
            formats.push(format);
          } else if (format.startIndex > endIndex) {
            // 在选区这后
            format.startIndex -= length;
            format.endIndex -= length;
            formats.push(format);
          } else {
            if (format.startIndex < startIndex) {
              format.endIndex = Math.max(startIndex, format.endIndex - length);
              formats.push(format);
            } else if (format.endIndex > endIndex) {
              format.startIndex = startIndex;
              format.endIndex = startIndex + format.endIndex - endIndex;
              formats.push(format);
            } else if (format.startIndex === 0 && startIndex === 0) {
              format.startIndex = format.endIndex = 0;
              formats.push(format);
            }
          }
        }
      });
      if (formats.length) {
        formatMap.setFormats(key, formats);
      }
      if (newFragmentFormats) {
        ff.formatMap.setFormats(key, newFragmentFormats);
      }
    });
    this.formatMap = formatMap;
    return ff;
  }

  /**
   * 向上清除当前片段所在的空树
   */
  cleanEmptyFragmentTreeBySelf() {
    const parent = this.parent;
    this.destroy();
    if (parent && !parent.contentLength) {
      parent.cleanEmptyFragmentTreeBySelf();
    }
  }

  /**
   * 通过当前节点的格式化信息创建虚拟 DOM 并返回
   */
  createVDom() {
    // if (!this.dataChanged) {
    //   return this.vNode;
    // }
    const formatRanges = this.formatMap.getCanApplyFormats();
    const contents = this.contents;
    const containerFormatRanges: Array<InlineFormat | BlockFormat> = [];
    const childFormatRanges: Array<InlineFormat> = [];

    formatRanges.forEach(format => {
      if (format instanceof BlockFormat || (format.startIndex === 0 && format.endIndex === this.contentLength)) {
        containerFormatRanges.push(format);
      } else {
        childFormatRanges.push(format);
      }
    });

    const root = new BlockToken(this, containerFormatRanges);
    this.vDomBuilder(childFormatRanges,
      root,
      0,
      contents.length
    );
    (this as { token: BlockToken }).token = root;
    return root;
  }

  /**
   * 清除当前片段的所有数据，并在父节点中删除
   */
  destroy() {
    this.contents.getFragments().forEach(f => f.destroy());
    if (this.parent) {
      const index = this.getIndexInParent();
      this.parent.delete(index, index + 1);
    }
    this.formatMap.clear();
    this.contents = new Contents();
    (<{ parent: Fragment }>this.parent) = null;
  }

  /**
   * 获取当前片段在父片段中的下标位置
   */
  getIndexInParent() {
    if (this.parent) {
      let i = this.parent.contents.find(this);
      if (i < 0) {
        throw new Error(`it's parent fragment is incorrect!`);
      }
      return i;
    }
    return -1;
  }

  /**
   * 根据格式化信息和范围生成树状数据结构，并把格式化信息未描述的区间设置为虚拟文本节点
   * @param formatRanges 格式化记录数据
   * @param parent 当前要生成树的父级
   * @param startIndex 生成范围的开始索引
   * @param endIndex 生成范围的结束位置
   */
  private vDomBuilder(formatRanges: Array<InlineFormat>, parent: BlockToken | InlineToken, startIndex: number, endIndex: number) {
    if (startIndex === 0 && endIndex === 0) {
      // 兼容空标签节点
      parent.children.push(new TextToken(this, 0, ''));
      return;
    }

    while (startIndex < endIndex) {
      let firstRange = formatRanges.shift();
      if (firstRange) {
        if (startIndex < firstRange.startIndex) {
          parent.children.push(...this.createNodesByRange(startIndex, firstRange.startIndex));
        }
        const container = new InlineToken(this, [firstRange], firstRange.startIndex, firstRange.endIndex);
        const childFormatRanges: Array<InlineFormat> = [];
        while (true) {
          const f = formatRanges[0];
          if (f && f.startIndex === firstRange.startIndex && f.endIndex === firstRange.endIndex) {
            container.formats.push(formatRanges.shift());
          } else {
            break;
          }
        }
        let index = 0;
        while (true) {
          const f = formatRanges[index];
          if (f && f.startIndex < firstRange.endIndex) {
            if (f.endIndex <= firstRange.endIndex) {
              childFormatRanges.push(formatRanges.shift());
            } else {
              const cloneRange = f.clone();
              cloneRange.endIndex = firstRange.endIndex;
              childFormatRanges.push(cloneRange);
              f.startIndex = firstRange.endIndex;
              index++;
            }
          } else {
            break;
          }
        }
        if (childFormatRanges.length) {
          this.vDomBuilder(childFormatRanges, container, firstRange.startIndex, firstRange.endIndex);
        } else {
          container.children.push(...this.createNodesByRange(firstRange.startIndex, firstRange.endIndex));
        }
        parent.children.push(container);
        startIndex = firstRange.endIndex;
      } else {
        parent.children.push(...this.createNodesByRange(startIndex, endIndex));
        break;
      }
    }
  }

  /**
   * 根据指定范围选取内容并创建节点后返回
   * @param startIndex
   * @param endIndex
   */
  private createNodesByRange(startIndex: number, endIndex: number) {
    const vNodes: Token[] = [];

    const c = this.sliceContents(startIndex, endIndex);
    let i = 0;
    c.forEach(item => {
      if (typeof item === 'string') {
        const v = new TextToken(this, i + startIndex, item);
        vNodes.push(v);
      } else if (item instanceof ViewData) {
        if (item instanceof Fragment) {
          vNodes.push(item.createVDom());
        } else if (item instanceof Single) {
          vNodes.push(new MediaToken(this, item, item.getCanApplyFormats(), i + startIndex))
        }
      }
      i += item.length;
    });
    return vNodes;
  }
}
