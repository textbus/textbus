import { Contents } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { View } from './view';
import { Priority } from '../toolbar/help';
import { BlockFormat, FormatRange, InlineFormat, SingleFormat } from './format';
import { Single } from './single';
import { getCanApplyFormats, mergeFormat } from './utils';
import { BlockToken, InlineToken, MediaToken, Token, TextToken } from '../renderer/tokens';
import { FormatDelta } from './parser';

export class Fragment extends View {
  readonly token: BlockToken;
  readonly parent: Fragment;

  get contentLength() {
    return this.contents.length;
  }

  private formatMatrix = new Map<Handler, Array<BlockFormat | InlineFormat>>();
  private contents = new Contents();

  constructor(formats?: FormatDelta[]) {
    super();
    if (Array.isArray(formats)) {
      formats.forEach(item => {
        this.formatMatrix.set(item.handler, [new BlockFormat({
          ...item,
          context: this
        })])
      })
    }
  }

  getFormatRangesByHandler(handler: Handler) {
    return this.formatMatrix.get(handler);
  }

  getFormatHandlers() {
    return Array.from(this.formatMatrix.keys());
  }

  getFormatRanges() {
    return Array.from(this.formatMatrix.values()).reduce((v, n) => v.concat(n), []);
  }

  setFormats(key: Handler, formatRanges: FormatRange[]) {
    this.formatMatrix.set(key, formatRanges.map(f => {
      f.context = this;
      return f;
    }));
  }

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

  cleanFormats() {
    this.formatMatrix.clear();
    this.markDirty(true);
  }

  useFormats(formats: Map<Handler, Array<BlockFormat | InlineFormat>>) {
    this.markDirty();

    this.formatMatrix = new Map<Handler, Array<BlockFormat | InlineFormat>>();
    Array.from(formats.keys()).forEach(key => {
      this.formatMatrix.set(key, formats.get(key).map(i => {
        i.context = this;
        return i.clone();
      }));
    });
  }

  getFormatMatrix() {
    const formatMatrix = new Map<Handler, Array<BlockFormat | InlineFormat>>();
    Array.from(this.formatMatrix.keys()).forEach(key => {
      formatMatrix.set(key, this.formatMatrix.get(key).map(i => {
        const c = i.clone();
        c.context = null;
        return c;
      }));
    });
    return formatMatrix;
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
    ff.formatMatrix = new Map<Handler, Array<BlockFormat | InlineFormat>>();
    Array.from(this.formatMatrix.keys()).forEach(key => {
      ff.formatMatrix.set(key, this.formatMatrix.get(key).map(f => {
        const c = f.clone();
        c.context = ff;
        return c;
      }));
    });
    return ff;
  }

  useContents(contents: Contents) {
    this.markDirty();
    this.contents = contents;
    contents.slice(0).forEach(i => {
      if (i instanceof Single || i instanceof Fragment) {
        (<{ parent: Fragment }>i.parent) = this;
      }
    });
  }

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
      let childFormat: InlineFormat;
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
            childFormat = new InlineFormat({
              startIndex: format.startIndex + index,
              endIndex: format.startIndex + index + item.length,
              handler: format.handler,
              context: format.context,
              state: format.state,
              cacheData: format.cacheData
            });
            formats.push(childFormat);
          } else {
            childFormat.endIndex = format.startIndex + index + item.length;
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
  insert(content: string | View, index: number) {
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
    Array.from(this.formatMatrix.values()).reduce((v, n) => v.concat(n), []).filter(format => {
      return format instanceof InlineFormat || format instanceof SingleFormat;
    }).forEach((format: InlineFormat) => {
      if (content instanceof Fragment && format.startIndex < index && format.endIndex >= index) {
        newFormats.push(new InlineFormat({
          startIndex: index + 1,
          endIndex: format.endIndex + 1,
          state: format.state,
          handler: format.handler,
          context: this,
          cacheData: format.cacheData.clone()
        }));
        format.endIndex = index;
      } else {
        if (format.startIndex >= index && format.startIndex > 0) {
          format.startIndex += content.length;
        }
        if (format.endIndex >= index) {
          format.endIndex += content.length;
        }
      }
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
  append(content: string | View, insertAdjacentInlineFormat = false) {
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
      Array.from(this.formatMatrix.values()).reduce((v, n) => v.concat(n), []).filter(format => {
        return [Priority.Property, Priority.Inline].includes(format.handler.priority);
      }).forEach((format: InlineFormat) => {
        format.endIndex += content.length;
      })
    }
  }

  getContentAtIndex(index: number) {
    return this.contents.getContentAtIndex(index);
  }

  find(el: View) {
    return this.contents.find(el);
  }

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
    Array.from(this.formatMatrix.keys()).filter(key => {
      return [Priority.Inline, Priority.Property].includes(key.priority);
    }).forEach(key => {
      const formatRanges: InlineFormat[] = this.formatMatrix.get(key).filter(f => f instanceof InlineFormat);
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
      this.formatMatrix.set(key, newRanges);
    });

    Array.from(fragment.formatMatrix.keys()).filter(key => {
      return [Priority.Inline, Priority.Property].includes(key.priority);
    }).forEach(key => {
      const formatRanges: InlineFormat[] = fragment.formatMatrix.get(key).filter(f => f instanceof InlineFormat);
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
    const formatMatrix = new Map<Handler, Array<BlockFormat | InlineFormat>>();

    Array.from(this.formatMatrix.keys()).forEach(key => {
      const formats: Array<InlineFormat | BlockFormat> = [];
      const newFragmentFormats: Array<InlineFormat | BlockFormat> = [];
      this.formatMatrix.get(key).forEach(format => {
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
        formatMatrix.set(key, formats);
      }
      if (newFragmentFormats) {
        ff.formatMatrix.set(key, newFragmentFormats);
      }
    });
    this.formatMatrix = formatMatrix;
    return ff;
  }

  cleanEmptyFragmentTreeBySelf() {
    const parent = this.parent;
    this.destroy();
    if (parent && !parent.contentLength) {
      parent.cleanEmptyFragmentTreeBySelf();
    }
  }

  createVDom() {
    // if (!this.dataChanged) {
    //   return this.vNode;
    // }
    const formatRanges = getCanApplyFormats(this.formatMatrix) as Array<InlineFormat | BlockFormat>;
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

  mergeFormat(format: FormatRange, important = false) {
    this.markDirty();
    format.context = this;
    mergeFormat(this.formatMatrix, format, important);
  }

  destroy() {
    this.contents.getFragments().forEach(f => f.destroy());
    if (this.parent) {
      const index = this.getIndexInParent();
      this.parent.delete(index, index + 1);
    }
    this.formatMatrix.clear();
    this.contents = new Contents();
    (<{ parent: Fragment }>this.parent) = null;
  }

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

  private createNodesByRange(startIndex: number, endIndex: number) {
    const vNodes: Token[] = [];

    const c = this.sliceContents(startIndex, endIndex);
    let i = 0;
    c.forEach(item => {
      if (typeof item === 'string') {
        const v = new TextToken(this, i + startIndex, item);
        vNodes.push(v);
      } else if (item instanceof View) {
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
