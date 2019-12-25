import { ChildSlotModel, Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { AttrState } from '../toolbar/formats/forms/help';
import { CacheData } from '../toolbar/utils/cache-data';
import { Single } from '../parser/single';
import { FormatRange } from '../parser/format';

export class LinkCommander implements Commander<AttrState[]> {
  recordHistory = true;
  private attrs: AttrState[] = [];
  private tagName = 'a';

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
          const formats = range.commonAncestorFragment.getFormatRangesByHandler(handler);
          if (formats) {
            for (const format of formats) {
              if (range.startIndex > format.startIndex && range.endIndex <= format.endIndex) {
                format.cacheData.attrs = attrs
              }
            }
          }
        }
      }
      range.getSelectedScope().forEach(item => {
        let index = 0;
        item.context.sliceContents(item.startIndex, item.endIndex)
          .forEach(node => {
            if (node instanceof Single) {
              node.getFormatRangesByHandler(handler).forEach(format => {
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

  render(state: FormatState, rawElement?: HTMLElement, cacheData?: CacheData): ChildSlotModel {
    const el = document.createElement(this.tagName);
    if (cacheData && cacheData.attrs) {
      cacheData.attrs.forEach((value, key) => {
        el.setAttribute(key, value);
      })
    }
    return new ChildSlotModel(el);
  }
}
