import { Contents } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { View } from './view';
import { Priority } from '../toolbar/help';
import { BlockFormat, FormatRange, InlineFormat, SingleFormat } from './format';
import { Single } from './single';
import { getCanApplyFormats, mergeFormat } from './utils';
import { VBlockNode, VInlineNode, VMediaNode, VNode, VTextNode } from '../renderer/virtual-dom';

export class Fragment extends View {
  readonly vNode: VBlockNode;

  get contentLength() {
    return this.contents.length;
  }

  private formatMatrix = new Map<Handler, Array<BlockFormat | InlineFormat>>();
  private contents = new Contents();

  private destroyed = false;

  constructor(public parent: Fragment) {
    super();
  }

  getFormatRangesByHandler(handler: Handler) {
    return this.formatMatrix.get(handler);
  }

  cleanFormats() {
    this.formatMatrix.clear();
  }

  getFormatHandlers() {
    return Array.from(this.formatMatrix.keys());
  }

  getFormatRanges() {
    return Array.from(this.formatMatrix.values()).reduce((v, n) => v.concat(n), []);
  }

  useFormats(formats: Map<Handler, Array<BlockFormat | InlineFormat>>) {
    this.markDirty();

    this.formatMatrix = new Map<Handler, Array<BlockFormat | InlineFormat>>();
    Array.from(formats.keys()).forEach(key => {
      this.formatMatrix.set(key, formats.get(key).map(i => i.clone()));
    });
  }

  getFormatMatrix() {
    const formatMatrix = new Map<Handler, Array<BlockFormat | InlineFormat>>();
    Array.from(this.formatMatrix.keys()).forEach(key => {
      formatMatrix.set(key, this.formatMatrix.get(key).map(i => i.clone()));
    });
    return formatMatrix;
  }

  /**
   * 克隆当前片段的副本
   */
  clone(): Fragment {
    const ff = new Fragment(this.parent);
    ff.contents = this.contents.clone();
    ff.contents.slice(0).filter(item => {
      if (item instanceof Single || item instanceof Fragment) {
        item.parent = ff;
      }
    });
    ff.formatMatrix = new Map<Handler, Array<BlockFormat | InlineFormat>>();
    Array.from(this.formatMatrix.keys()).forEach(key => {
      ff.formatMatrix.set(key, this.formatMatrix.get(key).map(f => {
        return f.clone();
      }));
    });
    return ff;
  }

  useContents(contents: Contents) {
    this.markDirty();
    this.contents = contents;
    contents.slice(0).forEach(i => {
      if (i instanceof Single || i instanceof Fragment) {
        i.parent = this;
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
      content.parent = this;
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
      content.parent = this;
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

  getAllChildContentsLength() {
    return this.contents.getAllChildContentsLength();
  }

  insertFragmentContents(fragment: Fragment, index: number) {
    this.markDirty();
    const contentsLength = fragment.contents.length;
    const elements = fragment.contents.slice(0).map(content => {
      if (content instanceof Single || content instanceof Fragment) {
        content.parent = this;
      }
      return content;
    });
    this.contents.insertElements(elements, index);
    Array.from(this.formatMatrix.keys()).filter(key => {
      return [Priority.Inline, Priority.Property].includes(key.priority);
    }).forEach(key => {
      const formatRanges = this.formatMatrix.get(key) as InlineFormat[];
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

    Array.from(fragment.formatMatrix.keys())
      .filter(key => [Priority.Inline, Priority.Property].includes(key.priority))
      .forEach(key => {
        const formatRanges = fragment.formatMatrix.get(key) as InlineFormat[];
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
   *
   * @param startIndex
   * @param endIndex
   */
  delete(startIndex: number, endIndex = this.contents.length) {
    const ff = new Fragment(null);
    if (endIndex <= startIndex) {
      return ff;
    }
    this.markDirty();
    this.contents.delete(startIndex, endIndex).forEach(item => {
      if (typeof item === 'string') {
        ff.append(item);
      } else if (item instanceof Single || item instanceof Fragment) {
        // const c = item.clone();
        // c.parent = ff;
        ff.append(item);
        if (item instanceof Fragment) {
          item.destroyView();
        }
      }
    });
    const formatMatrix = new Map<Handler, Array<BlockFormat | InlineFormat>>();

    Array.from(this.formatMatrix.keys()).forEach(key => {
      const formats: Array<InlineFormat | BlockFormat> = [];
      const newFragmentFormats: Array<InlineFormat | BlockFormat> = [];
      this.formatMatrix.get(key).forEach(format => {
        if (format instanceof BlockFormat) {
          newFragmentFormats.push(format.clone());
          formats.push(format);
        } else {
          const cloneFormat = format.clone();
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


  createVDom() {
    if (!this.dataChanged) {
      return this.vNode;
    }
    const formatRanges = getCanApplyFormats(this.formatMatrix) as Array<InlineFormat | BlockFormat>;
    const contents = this.contents;
    const containerFormatRanges: Array<InlineFormat | BlockFormat> = [];
    const childFormatRanges: Array<InlineFormat> = [];

    formatRanges.forEach(format => {
      if (format instanceof BlockFormat) {
        containerFormatRanges.push(format);
      } else {
        childFormatRanges.push(format);
      }
    });

    const root = new VBlockNode(this, containerFormatRanges);
    this.vDomBuilder(childFormatRanges,
      root,
      0,
      contents.length
    );
    (this as { vNode: VBlockNode }).vNode = root;
    return root;
  }

  /**
   * 根据格式化信息和范围生成树状数据结构，并把格式化信息未描述的区间设置为虚拟文本节点
   * @param formatRanges 格式化记录数据
   * @param parent 当前要生成树的父级
   * @param startIndex 生成范围的开始索引
   * @param endIndex 生成范围的结束位置
   */
  private vDomBuilder(formatRanges: Array<InlineFormat>, parent: VBlockNode | VInlineNode, startIndex: number, endIndex: number) {
    // if (startIndex === 0 && endIndex === 0) {
    //   // 兼容空标签节点
    //   parent.children.push(new VirtualNode([new FormatRange({
    //     startIndex,
    //     endIndex,
    //     handler: null,
    //     context: this.context,
    //     state: null,
    //     cacheData: null
    //   })], this.context, startIndex, endIndex));
    //   return;
    // }

    while (startIndex < endIndex) {
      let firstRange = formatRanges.shift();
      if (firstRange) {
        if (startIndex < firstRange.startIndex) {
          parent.children.push(...this.createNodesByRange(startIndex, firstRange.startIndex));
        }
        const container = new VInlineNode(this, [firstRange], firstRange.startIndex, firstRange.endIndex);
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
    const vNodes: VNode[] = [];

    const c = this.sliceContents(startIndex, endIndex);
    let i = 0;
    c.forEach(item => {
      if (typeof item === 'string') {
        const v = new VTextNode(this, i + startIndex, item);
        vNodes.push(v);
      } else if (item instanceof View) {
        if (item instanceof Fragment) {
          vNodes.push(item.createVDom());
        } else if (item instanceof Single) {
          vNodes.push(new VMediaNode(this, item, item.getFormatRanges(), i + startIndex))
        }
      }
      i += item.length;
    });
    return vNodes;
  }

  // render(host: HTMLElement) {
  //   // this.viewRendered();
  //   // if (this.dirty) {
  //   //   if (this.dataChanged) {
  //   //     const t = this.renderer.render(getCanApplyFormats(this.formatMatrix), this.contents, host);
  //   //     // this
  //   //   } else {
  //   //     this.contents.getFragments().forEach(f => {
  //   //       f.render();
  //   //     });
  //   //   }
  //   // }
  //
  // }

  destroyView() {
    // this.renderer.destroy();
  }

  mergeFormat(format: FormatRange, important = false) {
    this.markDirty();
    mergeFormat(this.formatMatrix, format, important);
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyView();
    this.contents.getFragments().forEach(f => f.destroy());
    if (this.parent) {
      const index = this.getIndexInParent();
      this.parent.delete(index, index + 1);
    }
    this.formatMatrix.clear();
    this.contents = new Contents();
    this.parent = null;
    this.destroyed = true;
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
}
