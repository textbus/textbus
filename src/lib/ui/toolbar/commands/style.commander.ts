import {
  FormatData,
  FormatEffect,
  InlineFormatter,
} from '../../../core/_api';
import { CommandContext, Commander } from '../commander';

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
          effect: value ? FormatEffect.Valid : FormatEffect.Invalid,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          formatData: new FormatData({
            styles: {
              [this.name]: value
            }
          })
        });
      });
    });
  }
}
