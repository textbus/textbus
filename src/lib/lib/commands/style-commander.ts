import { ChildSlotModel, Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { FormatRange } from '../parser/fragment';
import { dtd } from '../dtd';

export class StyleCommander implements Commander<string | number> {
  recordHistory = true;
  private value: string | number;

  constructor(private name: string, private canApplyBlockElement = true) {
  }

  updateValue(value: string | number) {
    this.value = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        const r = new FormatRange({
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

  render(state: FormatState, rawElement?: HTMLElement): ChildSlotModel {
    if (!this.value) {
      return null;
    }
    if (rawElement) {
      if (this.canApplyBlockElement) {
        rawElement.style[this.name] = this.value;
        return null;
      } else if (/inline/.test(dtd[rawElement.tagName.toLowerCase()].display)) {
        rawElement.style[this.name] = this.value;
        return null;
      }
    }
    const el = document.createElement('span');
    el.style[this.name] = this.value;
    return new ChildSlotModel(el);
  }
}
