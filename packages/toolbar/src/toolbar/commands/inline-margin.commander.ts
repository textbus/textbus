import { FormatData, FormatEffect } from '@textbus/core';
import { InlineMarginFormatter } from '@textbus/formatters';

import { CommandContext, Commander } from '../commander';

export class InlineMarginCommander implements Commander<Map<string, string>> {
  recordHistory = true;

  constructor(private inlineFormatter: InlineMarginFormatter) {
  }

  command(context: CommandContext, params: Map<string, string>) {
    context.selection.ranges.forEach(range => {
      if (range.collapsed) {
        const commonAncestorFragment = range.commonAncestorFragment;
        commonAncestorFragment.getFormatKeys().forEach(token => {
          if (token !== this.inlineFormatter) {
            return;
          }
          commonAncestorFragment.getFormatRanges(token).forEach(format => {
            if (range.startIndex > format.startIndex && range.endIndex <= format.endIndex) {
              if (Array.from(params.values()).filter(i => i).length) {
                params.forEach((value, key) => {
                  format.formatData.styles.set(key, value);
                })
                commonAncestorFragment.markAsDirtied();
              } else {
                commonAncestorFragment.apply(token, {
                  ...format,
                  effect: FormatEffect.Invalid
                });
              }
            }
          });
        })
        return;
      }
      range.getSelectedScope().forEach(scope => {
        scope.fragment.apply(this.inlineFormatter, {
          effect: Array.from(params.values()).filter(i => i).length ? FormatEffect.Valid : FormatEffect.Invalid,
          startIndex: scope.startIndex,
          endIndex: scope.endIndex,
          formatData: new FormatData({
            styles: {
              marginTop: params.get('marginTop'),
              marginRight: params.get('marginRight'),
              marginBottom: params.get('marginBottom'),
              marginLeft: params.get('marginLeft'),
            }
          })
        })
      })
    })
  }
}
