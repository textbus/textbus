import { Commander } from './commander';
import { TBSelection } from '../../core/selection';
import { FormatEffect, Formatter } from '../../core/formatter';
import { FormatAbstractData } from '../../core/format-abstract-data';
import { Constructor } from '../../core/renderer';

export class CleanCommander implements Commander {
  recordHistory = true;

  constructor(private excludeFormatters: Constructor<Formatter>[] = []) {
  }

  command(selection: TBSelection, overlap: boolean): void {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(scope => {
        scope.fragment.getFormatRanges().forEach(f => {
          if (f.startIndex > scope.endIndex ||
            f.endIndex < f.startIndex ||
            this.excludeFormatters.map(constructor => f.renderer instanceof constructor).includes(true)) {
            return;
          }
          scope.fragment.mergeFormat({
            startIndex: scope.startIndex,
            endIndex: scope.endIndex,
            state: FormatEffect.Invalid,
            abstractData: new FormatAbstractData(),
            renderer: f.renderer
          });
        })
      })
    })
  }
}
