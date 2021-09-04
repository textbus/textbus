import {
  BranchAbstractComponent,
  FormatData,
  FormatEffect,
} from '@textbus/core';
import { LinkFormatter } from '@textbus/formatters';

import { CommandContext, Commander } from '../commander';

export class LinkCommander implements Commander<Map<string, string>> {
  recordHistory = true;


  constructor(private formatter: LinkFormatter) {
  }

  command(context: CommandContext, attrs: Map<string, string>): void {
    this.recordHistory = context.overlap ? !!context.selection.rangeCount : !context.selection.collapsed;
    if (!this.recordHistory) {
      return;
    }
    context.selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (context.overlap) {
          const commonAncestorFragment = range.commonAncestorFragment;
          commonAncestorFragment.getFormatKeys().forEach(token => {
            if (token !== this.formatter) {
              return;
            }
            commonAncestorFragment.getFormatRanges(token).forEach(format => {
              if (range.startIndex > format.startIndex && range.endIndex <= format.endIndex) {
                const href = attrs.get('href');
                const a = document.createElement('a')
                a.href = href;
                // xss filter
                if (href && a.hostname) {
                  format.formatData.attrs.clear();
                  attrs.forEach((value, key) => {
                    format.formatData.attrs.set(key, value);
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
        }
      }
      range.getSelectedScope().forEach(scope => {
        let index = 0;
        scope.fragment.sliceContents(scope.startIndex, scope.endIndex).forEach(content => {
          if (content instanceof BranchAbstractComponent) {
            content.slots.forEach(item => {
              item.apply(this.formatter, {
                startIndex: 0,
                endIndex: item.length,
                effect: FormatEffect.Valid,
                formatData: new FormatData({
                  attrs
                })
              })
            })
          } else {
            scope.fragment.apply(this.formatter, {
              startIndex: scope.startIndex + index,
              endIndex: scope.startIndex + index + content.length,
              effect: FormatEffect.Valid,
              formatData: new FormatData({
                attrs
              })
            })
          }
          index += content.length;
        })
      });
    })
  }
}
