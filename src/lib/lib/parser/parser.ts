import { Fragment } from './fragment';
import { dtd } from './dtd';
import { Single } from './single';
import { MatchState } from '../matcher/matcher';
import { BlockFormat, InlineFormat, SingleFormat } from './format';
import { AbstractData } from './abstract-data';
import { Handler } from '../toolbar/handlers/help';
import { EditableOptions, Priority } from '../toolbar/help';
import { HtmlNormalizer } from './html-normalizer';

export interface FormatDelta {
  handler: Handler;
  state: MatchState;
  abstractData: AbstractData;
}

export class Parser {
  private htmlNormalizer = new HtmlNormalizer();

  constructor(private registries: Handler[] = []) {
  }

  /**
   * 解析一段 HTML，并把解析后的抽象数据插入到 context 中
   * @param contents
   * @param context
   */
  parse(contents: string, context: Fragment) {
    const flatTree = this.htmlNormalizer.normalize(contents);
    const len = Array.from(flatTree.childNodes).reduce((len, node) => {
      return len + this.transform(node, context);
    }, 0);
    // this.mergeFormatsByHTMLElement(context, flatTree, 0, len);
    return context;
  }

  /**
   * 获取抽象数据在富文本中所有 handler 的匹配数据
   * @param data
   */
  createFormatDeltasByAbstractData(data: AbstractData): FormatDelta[] {
    return this.registries.map(item => {
      return {
        handler: item,
        state: item.matcher.matchData(data),
        abstractData: new AbstractData(data)
      }
    }).filter(item => item.state !== MatchState.Invalid);
  }

  /**
   * 获取 HTML 节点在富文本中所有 handler 的匹配数据
   * @param element
   */
  createFormatDeltasByHTMLElement(element: HTMLElement): FormatDelta[] {
    return this.registries.map(item => {
      return {
        handler: item,
        state: item.matcher.matchNode(element),
        abstractData: this.getAbstractData(element,
          typeof item.editableOptions === 'function'
            ? item.editableOptions(element)
            : item.editableOptions
        )
      };
    }).filter(item => item.state !== MatchState.Invalid);
  }

  private mergeFormatsByHTMLElement(context: Fragment | Single, by: HTMLElement, startIndex: number, len: number) {
    this.registries.map(item => {
      return {
        handler: item,
        state: item.matcher.matchNode(by),
        abstractData: this.getAbstractData(by,
          typeof item.editableOptions === 'function'
            ? item.editableOptions(by)
            : item.editableOptions
        )
      };
    }).filter(item => item.state !== MatchState.Invalid).forEach(item => {

      switch (item.handler.priority) {
        case Priority.Default:
        case Priority.Block:
        case Priority.BlockStyle:
          if (context instanceof Fragment) {
            context.mergeFormat(new BlockFormat({
              context,
              ...item
            }), false);
          } else {
            context.mergeFormat(new SingleFormat({
              ...item,
              context
            }));
          }

          break;
        case Priority.Inline:
        case Priority.Property:
          if (context instanceof Fragment) {
            context.mergeFormat(new InlineFormat({
              startIndex,
              endIndex: startIndex + len,
              context,
              ...item
            }), false)
          } else {
            context.mergeFormat(new SingleFormat({
              context,
              ...item
            }));
          }
          break;
      }
    })
  }

  /**
   * 把 DOM 结构转化成编辑器可用的数据结构
   * @param from 要采集数据的 DOM 节点
   * @param context 采集后数据存放的片段
   */
  private transform(from: Node, context: Fragment): number {
    if (from.nodeType === 3) {
      const textContent = from.textContent;
      context.append(textContent.replace(/&nbsp;/g, ' '));
      return textContent.length;
    } else if (from.nodeType === 1) {
      const tagName = (from as HTMLElement).tagName.toLowerCase();
      if (dtd[tagName].display === 'none') {
        return 0;
      }
      if (/inline/.test(dtd[tagName].display)) {
        const start = context.contentLength;
        if (dtd[tagName].type === 'single') {
          const newSingle = new Single(tagName);
          context.append(newSingle);
          this.mergeFormatsByHTMLElement(newSingle, from as HTMLElement, start, start + 1);
          return 1;
        } else {
          const len = Array.from(from.childNodes).reduce((len, node) => {
            return len + this.transform(node, context);
          }, 0);
          this.mergeFormatsByHTMLElement(context, from as HTMLElement, start, len);
          return len;
        }
      } else {
        const newBlock = new Fragment();
        let nodes: Node[];
        if (dtd[tagName].limitChildren) {
          nodes = Array.from((from as HTMLElement).children).filter(el => {
            return dtd[tagName].limitChildren.includes(el.tagName.toLowerCase());
          });
        } else {
          nodes = Array.from(from.childNodes);
        }
        nodes.forEach(node => {
          this.transform(node, newBlock);
        });
        this.mergeFormatsByHTMLElement(newBlock, from as HTMLElement, 0, newBlock.contentLength);
        context.append(newBlock);
        return 1;
      }
    }
  }

  private getAbstractData(node: HTMLElement, config?: EditableOptions): AbstractData {
    if (!config) {
      return new AbstractData();
    }
    const attrs = new Map<string, string>();
    if (config.attrs) {
      config.attrs.forEach(key => {
        attrs.set(key, node.getAttribute(key));
      });
    }
    let style: { name: string, value: string } = null;
    if (config.styleName) {
      const v = node.style[config.styleName];
      if (v) {
        style = {
          name: config.styleName,
          value: v
        };
      }
    }
    return new AbstractData({
      tag: config.tag ? node.nodeName.toLowerCase() : null,
      attrs: attrs.size ? attrs : null,
      style
    });
  }
}
