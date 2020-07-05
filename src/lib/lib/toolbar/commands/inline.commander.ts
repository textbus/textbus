import { Commander, TBSelection, InlineFormatter, FormatEffect, FormatAbstractData } from '../../core/_api';

export class InlineCommander implements Commander {
  recordHistory = true;

  constructor(private tagName: string, private formatter: InlineFormatter) {
  }

  command(selection: TBSelection, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply({
          state: overlap ? FormatEffect.Invalid : FormatEffect.Valid,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          renderer: this.formatter,
          abstractData: new FormatAbstractData({
            tag: this.tagName
          })
        });
      });
    });
  }
}
