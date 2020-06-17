import {
  Commander,
  TBSelection,
  FormatEffect,
  FormatAbstractData,
  Constructor,
  BlockFormatter,
  InlineFormatter
} from '../../core/_api';

export class CleanCommander implements Commander {
  recordHistory = true;

  constructor(private excludeFormatters: Constructor<BlockFormatter | InlineFormatter>[] = []) {
  }

  command(selection: TBSelection, overlap: boolean): void {
    selection.ranges.forEach(range => {
      range.getSuccessiveContents().forEach(scope => {
        scope.fragment.getFormatRanges().forEach(f => {
          if (f.startIndex > scope.endIndex ||
            f.endIndex < f.startIndex ||
            this.excludeFormatters.map(constructor => f.renderer instanceof constructor).includes(true)) {
            return;
          }
          scope.fragment.apply({
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
