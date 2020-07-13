import {
  Commander,
  TBSelection,
  FormatEffect,
  FormatAbstractData,
  Constructor,
  BlockFormatter,
  InlineFormatter
} from '../../core/_api';
import { BrComponent } from '../../components/br.component';

export class CleanCommander implements Commander {
  recordHistory = true;

  constructor(private excludeFormatters: Constructor<BlockFormatter | InlineFormatter>[] = []) {
  }

  command(selection: TBSelection, overlap: boolean): void {
    selection.ranges.forEach(range => {
      range.getSuccessiveContents().forEach(scope => {
        if (scope.fragment === range.startFragment &&
          scope.startIndex <= range.startIndex &&
          scope.endIndex >= range.endIndex) {
          scope.startIndex = range.startIndex;
        }
        if (scope.fragment === range.endFragment &&
          scope.startIndex <= range.startIndex &&
          scope.endIndex >= range.endIndex) {
          scope.endIndex = range.endIndex;
        }

        let isDeleteBlockFormat = false;
        if (scope.startIndex === 0) {
          if (scope.endIndex === scope.fragment.contentLength) {
            isDeleteBlockFormat = true;
          } else if (scope.endIndex === scope.fragment.contentLength - 1) {
            const lastContent = scope.fragment.getContentAtIndex(scope.fragment.contentLength - 1);
            if (lastContent instanceof BrComponent) {
              isDeleteBlockFormat = true;
            }
          }
        }

        scope.fragment.getFormatRanges().forEach(f => {
          if (f.startIndex > scope.endIndex ||
            f.endIndex < f.startIndex ||
            this.excludeFormatters.map(constructor => f.renderer instanceof constructor).includes(true)) {
            return;
          }
          if (f.renderer instanceof BlockFormatter && !isDeleteBlockFormat) {
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
