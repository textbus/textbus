import { ChildSlotModel, Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { InlineFormat } from '../parser/format';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { AbstractData } from '../parser/abstract-data';
import { VElement } from '../renderer/element';

export class InlineCommander implements Commander {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean) {
    let flag = false;
    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (!overlap) {
          flag = true;
          const old = range.commonAncestorFragment.getFormatRangesByHandler(handler);
          const f = new InlineFormat({
            startIndex: range.startIndex,
            endIndex: range.startIndex,
            handler,
            context: range.commonAncestorFragment,
            state: FormatState.Valid,
            abstractData: {
              tag: 'strong'
            }
          });
          if (old) {
            old.push(f);
          } else {
            range.commonAncestorFragment.setFormats(handler, [f]);
          }
          return;
        }
        // range.commonAncestorFragment.splitFormatRange(handler, range.startIndex);
        return;
      }
      flag = true;
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
    });
    this.recordHistory = flag;
  }

  render(state: FormatState, rawElement?: VElement, abstractData?: AbstractData) {
    return new ChildSlotModel(new VElement(this.tagName));
  }
}
