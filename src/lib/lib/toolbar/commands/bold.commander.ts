import { Commander, TBSelection, InlineFormatter, FormatEffect, FormatAbstractData } from '../../core/_api';

export class BoldCommander implements Commander<InlineFormatter> {
  recordHistory = true;

  constructor(private formatter: InlineFormatter) {
  }

  command(selection: TBSelection, overlap: boolean): void {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply({
          state: overlap ? FormatEffect.Invalid : FormatEffect.Valid,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          renderer: this.formatter,
          abstractData: new FormatAbstractData({
            tag: 'strong'
          })
        });
      });
    });
  }
}
