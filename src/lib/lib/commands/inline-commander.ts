import { ChildSlotModel, Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { InlineFormat } from '../parser/format';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { AbstractData } from '../toolbar/utils/abstract-data';
import { VElement } from '../renderer/element';

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
          abstractData: {
            tag: this.tagName
          }
        });
        item.context.apply(r, false);
      });
    })
  }

  render(state: FormatState, rawElement?: VElement, abstractData?: AbstractData) {
    return new ChildSlotModel(new VElement(this.tagName));
  }
}
