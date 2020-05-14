import { FormatCommander } from './commander';
import { TBSelection } from '../viewer/selection';
import { Formatter, MatchState } from '../core/formatter';
import { AbstractData } from '../core/abstract-data';

export class StyleCommander implements FormatCommander<string> {
  recordHistory = true;

  private value = '';

  constructor(private name: string) {
  }

  updateValue(value: string) {
    this.value = value;
  }

  command(selection: TBSelection, handler: Formatter, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        item.fragment.apply({
          state: MatchState.Valid,
          startIndex: item.startIndex,
          endIndex: item.endIndex,
          renderer: handler,
          abstractData: new AbstractData({
            style: {
              name: this.name,
              value: this.value
            }
          })
        });
      });
    });
  }
}
