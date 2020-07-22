import { Commander, FormatEffect, TBSelection } from '../../core/_api';
import { linkFormatter } from '../../formatter/link.formatter';

export class UnlinkCommander implements Commander {
  recordHistory = true;

  command(selection: TBSelection, overlap: boolean) {
    selection.ranges.forEach(range => {
      if (range.collapsed) {
        range.startFragment.getFormatRanges(linkFormatter).filter(f => {
          return f.startIndex < range.startIndex && f.endIndex >= range.endIndex;
        }).forEach(f => {
          range.startFragment.apply(linkFormatter, {
            ...f,
            state: FormatEffect.Invalid
          })
        });
      } else {
        range.getSuccessiveContents().forEach(item => {
          item.fragment.apply(linkFormatter, {
            state: FormatEffect.Invalid,
            abstractData: null,
            startIndex: item.startIndex,
            endIndex: item.endIndex
          });
        })
      }
    })
  }
}
