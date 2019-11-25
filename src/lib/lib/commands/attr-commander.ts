import { ChildSlotModel, Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { AttrState } from '../toolbar/formats/forms/help';
import { CacheData } from '../toolbar/utils/cache-data';
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
    selection.ranges.forEach(range => {
      if (range.collapsed) {
        const formats = range.commonAncestorFragment.formatMatrix.get(handler);
        if (formats) {
          for (const format of formats) {
            if (range.startIndex > format.startIndex && range.endIndex <= format.endIndex) {
              const attrs = new Map<string, string>();
              this.attrs.forEach(attr => {
                attrs.set(attr.name, attr.value.toString());
              });
              format.cacheData.attrs = attrs
            }
          }
        }
        return;
      }
      range.getSelectedScope().forEach(item => {
        const attrs = new Map<string, string>();
        this.attrs.forEach(attr => {
          attrs.set(attr.name, attr.value.toString());
        });
        item.context.apply(new FormatRange({
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          context: item.context,
          state: FormatState.Valid,
          handler,
          cacheData: new CacheData({
            attrs
          })
        }), true)
      });
    });
  }

  render(state: FormatState, rawElement?: HTMLElement, cacheData?: CacheData): ChildSlotModel {
    const el = document.createElement(this.tagName);
    if (cacheData && cacheData.attrs) {
      cacheData.attrs.forEach((value, key) => {
        if (value) {
          el.setAttribute(key, value);
        }
      })
    }
    return new ChildSlotModel(el);
  }
}
