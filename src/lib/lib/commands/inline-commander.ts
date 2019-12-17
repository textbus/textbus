import { ChildSlotModel, Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { FormatRange } from '../parser/format';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { CacheData } from '../toolbar/utils/cache-data';

export class InlineCommander implements Commander<any> {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        const r = new FormatRange({
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          handler,
          context: item.context,
          state: overlap ? FormatState.Invalid : FormatState.Valid,
          cacheData: {
            tag: this.tagName
          }
        });
        item.context.apply(r, false);
      });
    })
  }

  render(state: FormatState, rawElement?: HTMLElement, cacheData?: CacheData) {
    switch (state) {
      case FormatState.Exclude:
        if (rawElement) {
          rawElement.style.fontWeight = 'normal';
          break;
        } else {
          const node = document.createElement('span');
          node.style.fontWeight = 'normal';
          return new ChildSlotModel(node);
        }
      case FormatState.Valid:
        if (this.tagName === 'strong') {
          if (/h[1-6]|th/.test(cacheData.tag)) {
            return null;
          }
        }
        return new ChildSlotModel(document.createElement(this.tagName));
    }
    return null;
  }
}
