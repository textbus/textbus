import { Commander, TBSelection, InlineFormatter, FormatEffect, FormatAbstractData } from '../../core/_api';

export class StyleCommander implements Commander<string> {
  recordHistory = true;

  private value = '';

  constructor(private name: string, private formatter: InlineFormatter) {
  }

  updateValue(value: string) {
    this.value = value;
  }

  command(selection: TBSelection, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply({
          state: FormatEffect.Valid,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          renderer: this.formatter,
          abstractData: new FormatAbstractData({
            style: {
              name: this.name,
              value: this.value
            }
          })
        });
      });
    });
  }
}
