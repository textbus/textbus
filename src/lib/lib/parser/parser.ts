import { Fragment } from './fragment';
import { dtd } from '../dtd';
import { Single } from './single';
import { FormatState } from '../matcher/matcher';
import { BlockFormat, InlineFormat, SingleFormat } from './format';
import { CacheData, EditableOptions } from '../toolbar/utils/cache-data';
import { Handler } from '../toolbar/handlers/help';
import { Priority } from '../toolbar/help';

export interface ParseState {
  handler: Handler;
  state: FormatState;
  cacheData: CacheData;
}

export class Parser {
  constructor(private registries: Handler[] = []) {
  }

  parse(element: HTMLElement, context: Fragment) {
    const flatTree = this.normalize(element);
    const len = Array.from(flatTree.childNodes).reduce((len, node) => {
      return len + this.transform(node, context);
    }, 0);
    this.mergeFormatsByNode(context, element, 0, len);
    return context;
  }

  getFormatStateByData(data: CacheData): ParseState[] {
    return this.registries.map(item => {
      return {
        handler: item,
        state: item.matcher.matchData(data),
        cacheData: new CacheData(data)
      }
    }).filter(item => item.state !== FormatState.Invalid);
  }

  getFormatStateByNode(node: HTMLElement): ParseState[] {
    return this.registries.map(item => {
      return {
        handler: item,
        state: item.matcher.matchNode(node),
        cacheData: this.getPreCacheData(node,
          typeof item.editableOptions === 'function'
            ? item.editableOptions(node)
            : item.editableOptions
        )
      };
    }).filter(item => item.state !== FormatState.Invalid);
  }

  private mergeFormatsByNode(context: Fragment | Single, by: HTMLElement, startIndex: number, len: number) {
    this.registries.map(item => {
      return {
        handler: item,
        state: item.matcher.matchNode(by),
        cacheData: this.getPreCacheData(by,
          typeof item.editableOptions === 'function'
            ? item.editableOptions(by)
            : item.editableOptions
        )
      };
    }).filter(item => item.state !== FormatState.Invalid).forEach(item => {

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
            }), false);
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
          const newSingle = new Single(context, tagName);
          context.append(newSingle);
          this.mergeFormatsByNode(newSingle, from as HTMLElement, start, start + 1);
          return 1;
        } else {
          const len = Array.from(from.childNodes).reduce((len, node) => {
            return len + this.transform(node, context);
          }, 0);
          this.mergeFormatsByNode(context, from as HTMLElement, start, len);
          return len;
        }
      } else {
        const newBlock = new Fragment(context);
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
        this.mergeFormatsByNode(newBlock, from as HTMLElement, 0, newBlock.contentLength);
        context.append(newBlock);
        return 1;
      }
    }
  }

  /**
   * 把一段 html 格式化成符合标准的结构，如 ul > a 改成 ul > li > p > a
   * @param el
   */
  private normalize(el: HTMLElement): Node {
    const fragment = document.createDocumentFragment();
    const limitChildren = dtd[el.tagName.toLowerCase()].limitChildren || [];

    const findChildTag = (node: HTMLElement) => {
      for (const t of Array.from(node.children).map(n => n.tagName.toLowerCase())) {
        if (limitChildren.indexOf(t) > -1) {
          return t;
        }
      }
      return '';
    };
    let limitChildTag = findChildTag(el);

    const nodes = Array.from(el.childNodes).filter(node => {
      if (node.nodeType === 3) {
        return /\S+/.test(node.textContent);
      }
      return node.nodeType === 1;
    });

    let newBlock: HTMLElement;
    for (const node of nodes) {
      if (node.nodeType === 1) {
        const tagName = (node as HTMLElement).tagName.toLowerCase();
        if (limitChildTag) {
          if (limitChildren.includes(tagName)) {
            const cloneContainer = node.cloneNode();
            fragment.appendChild(cloneContainer);
            if ((node as HTMLElement).tagName.toLowerCase() === 'td' && node.childNodes.length === 0) {
              cloneContainer.appendChild(document.createElement('br'));
            } else {
              Array.from(this.normalize(node as HTMLElement).childNodes).forEach(c => cloneContainer.appendChild(c));
            }
          } else {
            const temporaryContainer = document.createElement(limitChildTag);
            temporaryContainer.appendChild(node);
            const container = document.createElement(limitChildTag);
            fragment.appendChild(container);
            Array.from(this.normalize(temporaryContainer as HTMLElement).childNodes).forEach(c => container.appendChild(c));
          }
        } else {
          if (/inline/.test(dtd[tagName].display)) {
            if (!newBlock) {
              newBlock = document.createElement('p');
              fragment.appendChild(newBlock);
            }
            newBlock.appendChild(node);
          } else {
            newBlock = null;
            const cloneContainer = node.cloneNode();
            fragment.appendChild(cloneContainer);
            if (/p|h[1-6]/i.test((node as HTMLElement).tagName)) {
              Array.from(node.childNodes).forEach(c => cloneContainer.appendChild(c));
            } else {
              Array.from(this.normalize(node as HTMLElement).childNodes).forEach(c => cloneContainer.appendChild(c));
            }
          }
        }
      } else {
        if (!newBlock) {
          newBlock = document.createElement('p');
          fragment.appendChild(newBlock);
        }
        newBlock.appendChild(node);
      }
    }

    return fragment;
  }

  private getPreCacheData(node: HTMLElement, config?: EditableOptions): CacheData {
    if (!config) {
      return new CacheData();
    }
    const attrs = new Map<string, string>();
    if (config.attrs) {
      config.attrs.forEach(key => {
        attrs.set(key, node.getAttribute(key));
      });
    }
    let style: { name: string, value: string } = null;
    if (config.styleName) {
      style = {
        name: config.styleName,
        value: node.style[config.styleName]
      };
    }
    return new CacheData({
      tag: config.tag ? node.tagName.toLowerCase() : null,
      attrs: attrs.size ? attrs : null,
      style
    });
  }
}
