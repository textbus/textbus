import {
  CommandContext,
  Commander,
  FormatAbstractData,
  FormatEffect,
  InlineFormatter,
} from '../../core/_api';

export class StyleCommander implements Commander<string> {
  recordHistory = true;

  constructor(private name: string, private formatter: InlineFormatter) {
  }

  command(context: CommandContext, value: string) {
    const {selection} = context;
    this.recordHistory = !selection.collapsed;
    if (!this.recordHistory) {
      return;
    }
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply(this.formatter, {
          state: value ? FormatEffect.Valid : FormatEffect.Invalid,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          abstractData: new FormatAbstractData({
            styles: {
              [this.name]: value
            }
          })
        });
      });
    });
  }
}
