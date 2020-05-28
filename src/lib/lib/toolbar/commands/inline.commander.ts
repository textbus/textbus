import { Commander } from './commander';
import { TBSelection } from '../../core/selection';
import { InlineFormatter, FormatEffect } from '../../core/formatter';
import { FormatAbstractData } from '../../core/format-abstract-data';

export class InlineCommander implements Commander<string> {
  recordHistory = true;

  constructor(private tagName: string, private formatter: InlineFormatter) {
  }

  command(selection: TBSelection, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply({
          state: overlap ? FormatEffect.Invalid : FormatEffect.Valid,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          renderer: this.formatter,
          abstractData: new FormatAbstractData({
            tag: this.tagName
          })
        });
      });
    });
  }
}
