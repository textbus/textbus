import { dtd } from '../dtd';
import { Fragment, FormatRange } from './fragment';
import { Handler } from '../toolbar/handlers/help';
import { FormatState } from '../matcher/matcher';
import { CacheData, EditableOptions } from '../toolbar/utils/cache-data';
import { Editor } from '../editor';
import { SingleNode } from './single-node';

export class RootFragment extends Fragment {
  constructor(private registries: Handler[] = [], public editor: Editor) {
    super(null);
  }

  setContents(el: HTMLElement) {
    const flatTree = this.flat(el);
    const len = Array.from(flatTree.childNodes).reduce((len, node) => {
      return len + this.parse(node, this);
    }, 0);
    this.mergeFormatsByNode(this, el, 0, len);
  }

  clone() {
    return this;
  }

  private flat(el: HTMLElement, limit = 'p'): Node {
    const nodes = document.createDocumentFragment();
    let newBlock: HTMLElement;
    Array.from(el.childNodes).filter(node => {
      if (node.nodeType === 3) {
        return /\S+/.test(node.textContent);
      }
      return true;
    }).forEach(node => {
      if (node.nodeType === 1) {
        const tagName = (node as HTMLElement).tagName.toLowerCase();
        if (/inline/.test(dtd[tagName].display)) {
          if (!newBlock) {
            newBlock = document.createElement(limit);
            nodes.appendChild(newBlock);
          }
          newBlock.appendChild(node);
        } else {
          newBlock = null;
          const limitChildren = dtd[tagName].limitChildren;
          if (limitChildren) {
            for (const t of Array.from((node as HTMLElement).children).map(n => n.tagName.toLowerCase())) {
              if (limitChildren.indexOf(t) > -1) {
                const n = node.cloneNode();
                nodes.appendChild(n);
                Array.from(this.flat(node as HTMLElement).childNodes).forEach(node => {
                  const item = document.createElement(t);
                  item.appendChild(node);
                  n.appendChild(item);
                });
                return;
              }
            }
          }
          nodes.appendChild(this.flat(node as HTMLElement));
        }
      } else {
        if (!newBlock) {
          newBlock = document.createElement(limit);
          nodes.appendChild(newBlock);
        }
        newBlock.appendChild(node);
      }
    });

    return nodes;
  }

  private parse(from: Node, context: Fragment): number {
    if (from.nodeType === 3) {
      const textContent = from.textContent;
      context.contents.add(textContent);
      return textContent.length;
    } else if (from.nodeType === 1) {
      const tagName = (from as HTMLElement).tagName.toLowerCase();
      if (/inline/.test(dtd[tagName].display)) {
        const start = context.contents.length;
        if (dtd[tagName].type === 'single') {
          const newSingle = new SingleNode(context);
          context.contents.add(newSingle);
          this.mergeFormatsByNode(newSingle, from as HTMLElement, 0, 1);
          return 1;
        } else {
          const len = Array.from(from.childNodes).reduce((len, node) => {
            return len + this.parse(node, context);
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
          this.parse(node, newBlock);
        });
        this.mergeFormatsByNode(newBlock, from as HTMLElement, 0, newBlock.contents.length);
        context.contents.add(newBlock);
        return newBlock.contents.length;
      }
    }
  }

  private mergeFormatsByNode(context: Fragment|SingleNode, by: HTMLElement, startIndex: number, len: number) {
    this.registries.map(item => {
      return {
        token: item,
        state: item.matcher.matchNode(by),
        cacheData: this.getPreCacheData(by, item.cacheDataConfig)
      };
    }).filter(item => item.state !== FormatState.Invalid).forEach(item => {
      const newRange = new FormatRange({
        startIndex,
        endIndex: startIndex + len,
        handler: item.token,
        context,
        state: item.state,
        cacheData: item.cacheData
      });
      context.mergeFormat(newRange, false);
    })
  }

  private getPreCacheData(node: HTMLElement, config?: EditableOptions): CacheData {
    if (!config) {
      return null;
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
