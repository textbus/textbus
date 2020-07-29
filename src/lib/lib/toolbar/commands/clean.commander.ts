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

export class CleanCommander implements Commander<null> {
  recordHistory = true;

  constructor(private excludeFormatters: Constructor<BlockFormatter | InlineFormatter>[] = []) {
  }

  command(selection: TBSelection, _: null, overlap: boolean): void {
    let b = false;
    selection.ranges.forEach(range => {
      range.getSuccessiveContents().forEach(scope => {
        if (scope.fragment === range.startFragment &&
          scope.startIndex <= range.startIndex &&
          scope.endIndex >= range.endIndex) {
          scope.startIndex = range.startIndex;
          b = true;
        }
        if (scope.fragment === range.endFragment &&
          scope.startIndex <= range.startIndex &&
          scope.endIndex >= range.endIndex) {
          scope.endIndex = range.endIndex;
          b = true;
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

        scope.fragment.getFormatKeys().forEach(token => {
          if (this.excludeFormatters.map(constructor => token instanceof constructor).includes(true)) {
            return;
          }
          scope.fragment.getFormatRanges(token).forEach(f => {
            if (f.startIndex > scope.endIndex ||
              f.endIndex < f.startIndex) {
              return;
            }
            if (token instanceof BlockFormatter && !isDeleteBlockFormat) {
              return;
            }
            b = true;
            scope.fragment.apply(token, {
              startIndex: scope.startIndex,
              endIndex: scope.endIndex,
              state: FormatEffect.Invalid,
              abstractData: new FormatAbstractData(),
            });
          });
        })
      })
    })
    this.recordHistory = b;
  }
}
