import { FormatEffect, FormatData } from '../../../lib/core/_api';
import { CommandContext, Commander } from '../commander';
import { VerticalAlignFormatter } from '../../../lib/formatter/vertical-align.formatter';

export class VerticalAlignCommander implements Commander<string> {
  recordHistory = true;

  constructor(private formatter: VerticalAlignFormatter) {
  }

  command(context: CommandContext, params: string) {
    this.recordHistory = false;
    if (context.selection.collapsed) {
      return;
    }
    this.recordHistory = true;
    context.selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(scope => {
        scope.fragment.apply(this.formatter, {
          effect: FormatEffect.Valid,
          startIndex: scope.startIndex,
          endIndex: scope.endIndex,
          formatData: new FormatData({
            styles: {
              verticalAlign: params
            }
          })
        })
      })
    })
  }
}
