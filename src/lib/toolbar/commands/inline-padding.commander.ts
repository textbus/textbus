import { CommandContext, Commander, FormatAbstractData, FormatEffect } from '../../core/_api';
import {
  InlinePaddingFormatter
} from '../../formatter/_api';

export class InlinePaddingCommander implements Commander<Map<string, string>> {
  recordHistory = true;

  constructor(private inlineFormatter: InlinePaddingFormatter) {
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
                  format.abstractData.styles.set(key, value);
                })
                commonAncestorFragment.markAsDirtied();
              } else {
                commonAncestorFragment.apply(token, {
                  ...format,
                  state: FormatEffect.Invalid
                });
              }
            }
          });
        })
        return;
      }
      range.getSelectedScope().forEach(scope => {
        scope.fragment.apply(this.inlineFormatter, {
          state: Array.from(params.values()).filter(i => i).length ? FormatEffect.Valid : FormatEffect.Invalid,
          startIndex: scope.startIndex,
          endIndex: scope.endIndex,
          abstractData: new FormatAbstractData({
            styles: {
              paddingTop: params.get('paddingTop'),
              paddingRight: params.get('paddingRight'),
              paddingBottom: params.get('paddingBottom'),
              paddingLeft: params.get('paddingLeft'),
            }
          })
        })
      })
    })
  }
}
