import { FormatEffect } from '../../../lib/core/_api';
import { CommandContext, Commander } from '../commander';
import { linkFormatter } from '../../../lib/formatter/link.formatter';

export class UnlinkCommander implements Commander<null> {
  recordHistory = true;

  command(context: CommandContext) {
    context.selection.ranges.forEach(range => {
      if (range.collapsed) {
        range.startFragment.getFormatRanges(linkFormatter).filter(f => {
          return f.startIndex < range.startIndex && f.endIndex >= range.endIndex;
        }).forEach(f => {
          range.startFragment.apply(linkFormatter, {
            ...f,
            effect: FormatEffect.Invalid
          })
        });
      } else {
        range.getSelectedScope().forEach(item => {
          item.fragment.apply(linkFormatter, {
            effect: FormatEffect.Invalid,
            formatData: null,
            startIndex: item.startIndex,
            endIndex: item.endIndex
          });
        })
      }
    })
  }
}
