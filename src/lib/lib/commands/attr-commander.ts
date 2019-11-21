import { ChildSlotModel, Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { AttrState } from '../toolbar/formats/forms/help';
import { CacheData } from '../toolbar/utils/cache-data';

export class AttrCommander implements Commander<AttrState[]> {

  private attrs: AttrState[] = [];

  constructor(private tagName: string) {
  }

  updateValue(value: AttrState[]): void {
    this.attrs = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
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
