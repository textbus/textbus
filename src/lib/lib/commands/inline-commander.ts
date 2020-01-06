import { ChildSlotModel, Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { InlineFormat } from '../parser/format';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { CacheData } from '../toolbar/utils/cache-data';

export class InlineCommander implements Commander {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        const r = new InlineFormat({
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
    return new ChildSlotModel(document.createElement(this.tagName));
  }
}
