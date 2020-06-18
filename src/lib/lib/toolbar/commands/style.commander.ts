import { Commander, FormatAbstractData, FormatEffect, InlineFormatter, TBSelection } from '../../core/_api';

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
          state: this.value ? FormatEffect.Valid : FormatEffect.Invalid,
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
