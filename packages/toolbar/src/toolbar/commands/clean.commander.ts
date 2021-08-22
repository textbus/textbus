import {
  Type,
  FormatEffect,
  FormatData,
  BlockFormatter,
  InlineFormatter,
  BrComponent
} from '@textbus/core';

import { CommandContext, Commander } from '../commander';

export class CleanCommander implements Commander<null> {
  recordHistory = true;

  constructor(private excludeFormatters: Type<BlockFormatter | InlineFormatter>[] = []) {
  }

  command(context: CommandContext): void {
    let b = false;
    context.selection.ranges.forEach(range => {
      range.getSuccessiveContents().forEach(scope => {
        if (scope.fragment === range.startFragment &&
          scope.startIndex <= range.startIndex) {
          scope.startIndex = range.startIndex;
          b = true;
        }
        if (scope.fragment === range.endFragment &&
          scope.endIndex >= range.endIndex) {
          scope.endIndex = range.endIndex;
          b = true;
        }

        let isDeleteBlockFormat = false;
        if (scope.startIndex === 0) {
          if (scope.endIndex === scope.fragment.length) {
            isDeleteBlockFormat = true;
          } else if (scope.endIndex === scope.fragment.length - 1) {
            const lastContent = scope.fragment.getContentAtIndex(scope.fragment.length - 1);
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
              effect: FormatEffect.Invalid,
              formatData: new FormatData(),
            });
          });
        })
      })
    })
    this.recordHistory = b;
  }
}
