import { Commander, FormatAbstractData, FormatEffect, InlineFormatter, TBSelection } from '../../core/_api';

export class StyleCommander implements Commander<string> {
  recordHistory = true;

  private value = '';

  constructor(private name: string, private formatter: InlineFormatter) {
  }

  updateValue(value: string) {
    this.value = value;
  }

  command(selection: TBSelection) {
    this.recordHistory = !selection.collapsed;
    if (!this.recordHistory) {
      return;
    }
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply(this.formatter, {
          state: this.value ? FormatEffect.Valid : FormatEffect.Invalid,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          abstractData: new FormatAbstractData({
            styles: {
              name: this.name,
              value: this.value
            }
          })
        });
      });
    });
  }
}
