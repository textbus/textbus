import { Commander, TBSelection, InlineFormatter, FormatEffect, FormatAbstractData } from '../../core/_api';

export class InlineCommander implements Commander<null> {
  recordHistory = true;

  constructor(private tagName: string, private formatter: InlineFormatter) {
  }

  command(selection: TBSelection, _: null, overlap: boolean) {
    this.recordHistory = !selection.collapsed;
    if (!this.recordHistory) {
      return;
    }
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply(this.formatter, {
          state: overlap ? FormatEffect.Invalid : FormatEffect.Valid,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          abstractData: new FormatAbstractData({
            tag: this.tagName
          })
        });
      });
    });
  }
}
