import { dtd } from '../dtd';
import { Fragment, FormatRange } from './fragment';
import { Handler } from '../toolbar/handlers/help';
import { FormatState } from '../matcher/matcher';
import { SingleNode } from './single-node';
import { CacheData, CacheDataConfig } from '../toolbar/help';

export class Parser extends Fragment {
  constructor(private registries: Handler[] = []) {
    super(null);
  }

  setContents(el: HTMLElement) {
    const flatTree = this.flat(el);
    const len = Array.from(flatTree.childNodes).reduce((len, node) => {
      return len + this.parse(node, this);
    }, 0);
    this.mergeFormatsByNode(this, el, 0, len);
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
          const attrs = Array.from((from as HTMLElement).attributes);
          const newSingle = new SingleNode(tagName, attrs);
          context.contents.add(newSingle);
          return 1;
        } else {
          const len = Array.from(from.childNodes).reduce((len, node) => {
            return len + this.parse(node, context);
          }, 0);
          this.mergeFormatsByNode(context, from, start, len);
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
        this.mergeFormatsByNode(newBlock, from, 0, newBlock.contents.length);
        context.contents.add(newBlock);
        return newBlock.contents.length;
      }
    }
  }

  private mergeFormatsByNode(context: Fragment, by: Node, startIndex: number, len: number) {
    this.registries.map(item => {
      return {
        token: item,
        ...item.matcher.matchNode(by),
        cacheData: by.nodeType === 1 ? this.getPreCacheData(by as HTMLElement, item.cacheDataConfig) : null
      };
    }).filter(item => item.state !== FormatState.Invalid).forEach(item => {
      const newRange = new FormatRange({
        startIndex,
        endIndex: startIndex + len,
        handler: item.token,
        context,
        state: item.state,
        matchDescription: item.matchDescription,
        cacheData: item.cacheData
      });
      context.mergeFormat(newRange);
    })
  }

  private getPreCacheData(node: HTMLElement, config?: CacheDataConfig): CacheData {
    if (!config) {
      return null;
    }
    const data: CacheData = {};
    if (config.attrs) {
      const attrs = new Map<string, string>();
      config.attrs.forEach(key => {
        attrs.set(key, node.getAttribute(key));
      });
      data.attrs = attrs;
    }
    if (config.styleName) {
      data.styles = {
        name: config.styleName,
        value: node.style[config.styleName]
      };
    }
    return data;
  }
}
