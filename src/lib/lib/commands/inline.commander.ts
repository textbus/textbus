import { Commander } from './commander';
import { TBSelection } from '../viewer/selection';
import { Formatter, MatchState } from '../core/formatter';
import { AbstractData } from '../core/abstract-data';

export class InlineCommander implements Commander<string> {
  recordHistory = true;

  constructor(private tagName: string, private formatter: Formatter) {
  }

  command(selection: TBSelection, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply({
          state: overlap ? MatchState.Invalid : MatchState.Valid,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          renderer: this.formatter,
          abstractData: new AbstractData({
            tag: this.tagName
          })
        });
      });
    });
  }
}
