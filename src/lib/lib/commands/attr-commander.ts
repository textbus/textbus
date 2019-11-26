import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { AttrState } from '../toolbar/formats/forms/help';
import { CacheData } from '../toolbar/utils/cache-data';
import { SingleNode } from '../parser/single-node';
import { FormatRange } from '../parser/fragment';

export class AttrCommander implements Commander<AttrState[]> {
  recordHistory = true;
  private attrs: AttrState[] = [];

  constructor(private tagName: string) {
  }

  updateValue(value: AttrState[]): void {
    this.attrs = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    const attrs = new Map<string, string>();
    this.attrs.forEach(attr => {
      attrs.set(attr.name, attr.value.toString());
    });
    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (overlap) {
          const formats = range.commonAncestorFragment.formatMatrix.get(handler);
          if (formats) {
            for (const format of formats) {
              if (range.startIndex > format.startIndex && range.endIndex <= format.endIndex) {
                format.cacheData.attrs = attrs
              }
            }
          }
        } else {
          Array.from(range.commonAncestorFragment.formatMatrix.values()).reduce((v, n) => {
            return v.concat(n);
          }, []).forEach(format => {
            if (format.endIndex >= range.endIndex) {
              format.endIndex++;
            }
            if (format.startIndex > range.startIndex) {
              format.startIndex++;
            }
          });
          const newNode = new SingleNode(range.commonAncestorFragment, this.tagName);
          newNode.formatMatrix.set(handler, [new FormatRange({
            startIndex: range.startIndex,
            endIndex: range.startIndex + 1,
            handler,
            state: FormatState.Valid,
            context: newNode,
            cacheData: new CacheData({
              attrs
            })
          })]);
          range.commonAncestorFragment.contents.insert(newNode, range.startIndex);
          range.startIndex++;
          range.endIndex++;
        }
        return;
      }
      range.getSelectedScope().forEach(item => {
        let index = 0;
        item.context.contents.slice(item.startIndex, item.endIndex)
          .forEach(node => {
            if (node instanceof SingleNode) {
              node.formatMatrix.get(handler).forEach(format => {
                format.cacheData.attrs = attrs;
              });
            } else if (typeof node === 'string') {
              item.context.apply(new FormatRange({
                startIndex: item.startIndex + index,
                endIndex: item.endIndex + index,
                handler,
                state: FormatState.Valid,
                context: item.context,
                cacheData: new CacheData({
                  attrs
                })
              }), false);
            }
            index += node.length;
          })
      });
    });
  }

  render(state: FormatState, rawElement?: HTMLElement, cacheData?: CacheData): ReplaceModel {
    const el = document.createElement(this.tagName);
    if (cacheData && cacheData.attrs) {
      cacheData.attrs.forEach((value, key) => {
        el.setAttribute(key, value);
      })
    }
    return new ReplaceModel(el);
  }
}
