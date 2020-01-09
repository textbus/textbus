import { ChildSlotModel, Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { InlineFormat } from '../parser/format';
import { CacheData } from '../toolbar/utils/cache-data';
import { dtd } from '../dtd';
import { VElement } from '../renderer/element';

export class StyleCommander implements Commander<string | number> {
  recordHistory = true;
  private value: string | number;

  constructor(private name: string, private canApplyBlockFragment = true) {
  }

  updateValue(value: string | number) {
    this.value = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        const r = new InlineFormat({
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          handler,
          context: item.context,
          state: FormatState.Valid,
          cacheData: {
            style: {name: this.name, value: this.value}
          }
        });
        item.context.apply(r, false);
      });
    });
  }

  render(state: FormatState, rawElement?: VElement, cacheData?: CacheData): ChildSlotModel {
    if (cacheData && cacheData.style) {
      if (rawElement) {
        const isInline = dtd[rawElement.tagName.toLowerCase()].display === 'inline';
        if (this.canApplyBlockFragment || isInline) {
          rawElement.styles.set(cacheData.style.name, cacheData.style.value);
          return null;
        }
      }
      const el = new VElement('span');
      el.styles.set(cacheData.style.name, cacheData.style.value);
      return new ChildSlotModel(el);
    }
    return null;
  }
}
