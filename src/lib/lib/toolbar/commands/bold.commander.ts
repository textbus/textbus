import { Commander } from './commander';
import { TBSelection } from '../../core/selection';
import { Formatter, FormatEffect } from '../../core/formatter';
import { FormatAbstractData } from '../../core/format-abstract-data';

export class BoldCommander implements Commander<Formatter> {
  recordHistory = true;

  constructor(private formatter: Formatter) {
  }

  command(selection: TBSelection, overlap: boolean): void {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply({
          state: overlap ? FormatEffect.Invalid : FormatEffect.Valid,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          renderer: this.formatter,
          abstractData: new FormatAbstractData({
            tag: 'strong'
          })
        });
      });
    });
  }
}
