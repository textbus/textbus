import {
  InlineFormatter,
  FormatEffect,
  FormatData
} from '@textbus/core';
import { CommandContext, Commander } from '../commander';

export class InlineCommander implements Commander<null> {
  recordHistory = true;

  constructor(private tagName: string, private formatter: InlineFormatter) {
  }

  command(context: CommandContext) {
    this.recordHistory = !context.selection.collapsed;
    if (!this.recordHistory) {
      return;
    }
    context.selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply(this.formatter, {
          effect: context.overlap ? FormatEffect.Invalid : FormatEffect.Valid,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          formatData: new FormatData({
            tag: this.tagName
          })
        });
      });
    });
  }
}
